import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import WebRTCManager from '@/lib/webrtc';
import VideoControls from './VideoControls';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts';
import TopicSelector from './TopicSelector';
import { collection, addDoc, query, where, getDocs, updateDoc, serverTimestamp, arrayUnion, onSnapshot, doc, writeBatch, getDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import DeviceCheck from './DeviceCheck';

const VideoChat = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isFinding, setIsFinding] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [room, setRoom] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [filters, setFilters] = useState({
    language: 'en',
    continent: 'any',
  });
  const [role, setRole] = useState('participant');
  const [selectedDevices, setSelectedDevices] = useState(null);
  const [showDeviceCheck, setShowDeviceCheck] = useState(false);
  const webrtcRef = useRef(null);
  const localVideoRef = useRef(null);
  const roomUnsubscribeRef = useRef(null);
  const webrtcManager = useRef(null);
  const remoteStreamRef = useRef(null);

  // Set default language based on browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFilters(prev => ({
        ...prev,
        language: navigator.language.split('-')[0] || 'en'
      }));
    }
  }, []);

  const handleDeviceSelect = (devices) => {
    setSelectedDevices(devices);
    setShowDeviceCheck(false);
    findDiscussion();
  };

  const findDiscussion = async () => {
    if (!user || !selectedTopic) {
      toast.error('Please select a topic first.');
      return;
    }

    if (!selectedDevices) {
      setShowDeviceCheck(true);
      return;
    }
    
    setIsFinding(true);
    console.log('Starting search with filters:', { 
      topic: selectedTopic, 
      language: filters.language, 
      continent: filters.continent, 
      role,
      userId: user.uid 
    });
    
    try {
      const roomsRef = collection(db, 'rooms');
      const queryConditions = [
        where('topic', '==', selectedTopic),
        where('status', '==', 'waiting'),
        where('language', '==', filters.language),
      ];
      
      if (filters.continent !== 'any') {
        queryConditions.push(where('continent', '==', filters.continent));
      }
      
      const roomsQuery = query(roomsRef, ...queryConditions);
      const querySnapshot = await getDocs(roomsQuery);
      console.log('Found waiting rooms:', querySnapshot.size);
      
      let roomRef;
      let roomId;
      let roomData;
      
      // If there's an available room, join it using a transaction
      if (!querySnapshot.empty) {
        console.log('Found existing room to join');
        const existingRoom = querySnapshot.docs[0];
        roomRef = existingRoom.ref;
        roomId = existingRoom.id;
        roomData = existingRoom.data();
        
        // Make sure we're not joining our own room
        if (roomData.createdBy === user.uid) {
          console.log('Found own room, creating new one instead');
        } else {
          // Use transaction to update room
          await runTransaction(db, async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists()) {
              throw new Error('Room no longer exists');
            }
            
            const currentData = roomDoc.data();
            if (currentData.status !== 'waiting') {
              throw new Error('Room is no longer available');
            }
            
            transaction.update(roomRef, {
              status: 'active',
              participants: arrayUnion({
                uid: user.uid,
                displayName: user.displayName,
                role: role,
                joinedAt: new Date().toISOString()
              }),
              updatedAt: serverTimestamp()
            });
          });
          
          console.log('Successfully joined room:', roomId);
          setRoom({ id: roomId, data: roomData });
          setupRoomListener(roomRef);
          return;
        }
      }

      // Create a new room if no matching room is found or if we found our own room
      console.log('Creating new room');
      const newRoomData = {
        topic: selectedTopic,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        participants: [{
          uid: user.uid,
          displayName: user.displayName,
          role: role,
          joinedAt: new Date().toISOString()
        }],
        status: 'waiting',
        language: filters.language,
        continent: filters.continent,
      };
      
      roomRef = await addDoc(roomsRef, newRoomData);
      roomId = roomRef.id;
      console.log('Created new room:', roomId);

      setRoom({ id: roomId, data: newRoomData });
      setupRoomListener(roomRef);
      
    } catch (error) {
      console.error('Error finding discussion:', error);
      toast.error(error.message || 'Error finding discussion. Please try again.');
      setIsFinding(false);
    }
  };

  const setupRoomListener = (roomRef) => {
    if (roomUnsubscribeRef.current) {
      roomUnsubscribeRef.current();
    }

    const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
      const data = snapshot.data();
      console.log('Room update received:', data);

      if (!data) {
        console.log('Room was deleted or does not exist');
        handleLeaveDiscussion();
        return;
      }

      // Update room state
      setRoom({ id: snapshot.id, data });

      // If room is active and has two participants, initialize WebRTC
      if (data.status === 'active' && data.participants?.length === 2) {
        console.log('Room is active with 2 participants');
        
        // Find the other participant
        const otherParticipant = data.participants.find(p => p.uid !== user.uid);
        
        if (!isInRoom && otherParticipant) {
          console.log('Initializing WebRTC with other participant:', otherParticipant);
          setIsInRoom(true);
          setIsFinding(false);
          setConnectionState('connecting');
          
          try {
            await initializeWebRTC(otherParticipant.uid);
            
            // Update user's recent discussions
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              recentDiscussions: arrayUnion({
                roomId: snapshot.id,
                topic: data.topic,
                timestamp: new Date().toISOString(),
                participants: data.participants,
              }),
            });
          } catch (error) {
            console.error('Error initializing WebRTC:', error);
            toast.error('Failed to establish video connection. Please try again.');
            handleLeaveDiscussion();
          }
        }
      } else if (data.status === 'ended' || data.participants?.length < 2) {
        console.log('Room ended or participant left');
        handleLeaveDiscussion();
      }
    }, (error) => {
      console.error('Error in room listener:', error);
      toast.error('Lost connection to room. Please try again.');
      handleLeaveDiscussion();
    });
    
    roomUnsubscribeRef.current = unsubscribe;
  };

  const initializeWebRTC = async (remoteUserId) => {
    try {
      console.log('[VideoChat] Initializing WebRTC for remote user:', remoteUserId);
      
      if (!selectedDevices) {
        console.error('[VideoChat] No devices selected');
        toast.error('Please select your camera and microphone first');
        return;
      }

      if (!selectedDevices.video || !selectedDevices.audio) {
        console.error('[VideoChat] Missing required devices:', selectedDevices);
        toast.error('Both camera and microphone are required');
        return;
      }

      if (!webrtcManager.current) {
        console.log('[VideoChat] Creating new WebRTC manager');
        webrtcManager.current = new WebRTCManager(room.id, user.uid, db);
        
        webrtcManager.current.onTrack((track, stream) => {
          console.log('[VideoChat] Received remote track:', {
            kind: track.kind,
            enabled: track.enabled,
            id: track.id
          });
          remoteStreamRef.current = stream;
        });

        webrtcManager.current.onParticipantLeft((participantId) => {
          console.log('[VideoChat] Participant left:', participantId);
          remoteStreamRef.current = null;
        });

        webrtcManager.current.onConnectionStateChange((participantId, state) => {
          console.log('[VideoChat] Connection state changed:', {
            participantId,
            state
          });
          setConnectionState(state);
        });
      }

      console.log('[VideoChat] Initializing media with devices:', selectedDevices);
      await webrtcManager.current.initializeMedia(selectedDevices);
      console.log('[VideoChat] Media initialized successfully');

      console.log('[VideoChat] Creating peer connection');
      await webrtcManager.current.createPeerConnection(remoteUserId);
      console.log('[VideoChat] Peer connection created successfully');

      // Create and send offer
      console.log('[VideoChat] Creating offer');
      const offer = await webrtcManager.current.createOffer(remoteUserId);
      console.log('[VideoChat] Offer created successfully');
      
      await webrtcManager.current.sendSignalingMessage(remoteUserId, {
        type: 'offer',
        offer,
      });
      console.log('[VideoChat] Offer sent successfully');

    } catch (error) {
      console.error('[VideoChat] Error initializing WebRTC:', error);
      toast.error(error.message || 'Failed to initialize video chat');
      
      // Попытка восстановления
      if (error.message.includes('Failed to construct') || error.message.includes('InvalidStateError')) {
        console.log('[VideoChat] Attempting to recover from WebRTC error');
        webrtcManager.current = null; // Сбрасываем менеджер
        remoteStreamRef.current = null;
        setConnectionState('disconnected');
        
        // Даем время на очистку ресурсов
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Пробуем инициализировать заново
        initializeWebRTC(remoteUserId);
      }
    }
  };

  // Add cleanup function for old rooms
  const cleanupOldRooms = async () => {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const oldRoomsQuery = query(
        collection(db, 'rooms'),
        where('createdAt', '<=', oneHourAgo),
        where('status', 'in', ['ended', 'waiting'])
      );

      const snapshot = await getDocs(oldRoomsQuery);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error cleaning up old rooms:', error);
    }
  };

  // Add cleanup function for old signaling messages
  const cleanupOldSignaling = async (roomId) => {
    try {
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      const oldSignalingQuery = query(
        collection(db, 'rooms', roomId, 'signaling'),
        where('timestamp', '<=', fiveMinutesAgo)
      );

      const snapshot = await getDocs(oldSignalingQuery);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error cleaning up old signaling messages:', error);
    }
  };

  // Call cleanup when component mounts and when leaving a room
  useEffect(() => {
    cleanupOldRooms();
    return () => {
      if (room?.id) {
        cleanupOldSignaling(room.id);
      }
    };
  }, []);

  const handleLeaveDiscussion = async () => {
    try {
      // Clean up WebRTC
      if (webrtcManager.current) {
        webrtcManager.current.cleanup();
        webrtcManager.current = null;
      }

      // Clean up room listener
      if (roomUnsubscribeRef.current) {
        roomUnsubscribeRef.current();
        roomUnsubscribeRef.current = null;
      }

      // Update room status if we're the last participant
      if (room) {
        const roomRef = doc(db, 'rooms', room.id);
        const roomDoc = await getDoc(roomRef);
        if (roomDoc.exists()) {
          const roomData = roomDoc.data();
          const updatedParticipants = roomData.participants.filter(
            p => p.uid !== user.uid
          );

          if (updatedParticipants.length === 0) {
            // If no participants left, delete the room
            await deleteDoc(roomRef);
          } else {
            // Otherwise update participants list
            await updateDoc(roomRef, {
              participants: updatedParticipants,
              status: 'waiting'
            });
          }
        }
      }

      // Reset state
      setRoom(null);
      setIsInRoom(false);
      setIsFinding(false);
      setParticipants(new Map());
      setConnectionState('disconnected');
      setIsConnected(false);

    } catch (error) {
      console.error('Error leaving discussion:', error);
      toast.error('Error leaving discussion. Please try refreshing the page.');
    }
  };

  const toggleVideo = async () => {
    try {
      await webrtcManager.current?.toggleVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  const toggleAudio = async () => {
    try {
      await webrtcManager.current?.toggleAudio(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcManager.current) {
        webrtcManager.current.disconnect();
      }
      if (roomUnsubscribeRef.current) {
        roomUnsubscribeRef.current();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      {showDeviceCheck ? (
        <div className="max-w-2xl mx-auto">
          <DeviceCheck onComplete={handleDeviceSelect} />
        </div>
      ) : isInRoom ? (
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Local video */}
            <div className="relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-[360px] bg-gray-900 rounded-lg object-cover"
              />
              <div className="absolute bottom-4 left-4">
                <span className="px-2 py-1 bg-gray-900 text-white rounded text-sm">
                  You
                </span>
              </div>
            </div>

            {/* Remote videos */}
            {remoteStreamRef.current && (
              <div className="relative">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-[360px] bg-gray-900 rounded-lg object-cover"
                  srcObject={remoteStreamRef.current}
                />
                <div className="absolute bottom-4 left-4">
                  <span className="px-2 py-1 bg-gray-900 text-white rounded text-sm">
                    Partner
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Video controls */}
          <VideoControls
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            onToggleVideo={() => setIsVideoEnabled(!isVideoEnabled)}
            onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
            onLeave={handleLeaveDiscussion}
          />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4">
          <TopicSelector
            selectedTopic={selectedTopic}
            onTopicSelect={setSelectedTopic}
            filters={filters}
            setFilters={setFilters}
            role={role}
            setRole={setRole}
            onFindPartner={findDiscussion}
            isFinding={isFinding}
          />
        </div>
      )}
    </div>
  );
};

export default VideoChat; 