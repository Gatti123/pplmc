import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import WebRTCManager from '@/lib/webrtc';
import VideoControls from './VideoControls';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts';
import TopicSelector from './TopicSelector';
import { collection, addDoc, query, where, getDocs, updateDoc, serverTimestamp, arrayUnion, onSnapshot, doc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';

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
  const webrtcRef = useRef(null);
  const localVideoRef = useRef(null);
  const roomUnsubscribeRef = useRef(null);

  // Set default language based on browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFilters(prev => ({
        ...prev,
        language: navigator.language.split('-')[0] || 'en'
      }));
    }
  }, []);

  // Find a discussion room
  const findDiscussion = async () => {
    if (!user || !selectedTopic) {
      toast.error('Please select a topic first.');
      return;
    }
    
    setIsFinding(true);
    console.log('Starting search with filters:', { topic: selectedTopic, language: filters.language, continent: filters.continent, role });
    
    try {
      // Check for available rooms with the same topic and filters
      const roomsRef = collection(db, 'rooms');
      const queryConditions = [
        where('topic', '==', selectedTopic),
        where('status', '==', 'waiting'),
        where('language', '==', filters.language),
      ];
      
      // Add continent filter if not set to 'any'
      if (filters.continent !== 'any') {
        queryConditions.push(where('continent', '==', filters.continent));
      }
      
      const roomsQuery = query(roomsRef, ...queryConditions);
      const querySnapshot = await getDocs(roomsQuery);
      console.log('Found waiting rooms:', querySnapshot.size);
      
      let roomRef;
      let roomId;
      let roomData;
      
      // If there's an available room, join it
      if (!querySnapshot.empty) {
        console.log('Found existing room to join');
        const existingRoom = querySnapshot.docs[0];
        roomRef = existingRoom.ref;
        roomId = existingRoom.id;
        roomData = existingRoom.data();
        
        // Make sure we're not joining our own room
        if (roomData.createdBy === user.uid) {
          console.log('Found own room, creating new one instead');
          // Create new room below
        } else {
          // Update room with new participant
          await updateDoc(roomRef, {
            status: 'active',
            participants: arrayUnion({
              uid: user.uid,
              displayName: user.displayName,
              role: role,
              joinedAt: new Date().toISOString()
            }),
            updatedAt: serverTimestamp()
          });
          console.log('Joined existing room:', existingRoom.id);
          
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
      console.log('Created new room:', roomRef.id);

      setRoom({ id: roomId, data: newRoomData });
      setupRoomListener(roomRef);
      
    } catch (error) {
      console.error('Error finding discussion:', error);
      toast.error('Error finding discussion. Please try again.');
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
            await initializeWebRTC(snapshot.id);
            
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

  const initializeWebRTC = async (roomId) => {
    try {
      setConnectionState('initializing');
      
      // Create WebRTC manager instance
      const webrtc = new WebRTCManager(roomId, user.uid, db);
      webrtcRef.current = webrtc;

      // Initialize local media
      const localStream = await webrtc.initializeMedia(isVideoEnabled, isAudioEnabled);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // Handle remote participants
      webrtc.onTrack((userId, stream) => {
        console.log('Remote track received from:', userId);
        setParticipants(prev => new Map(prev).set(userId, stream));
        setConnectionState('connected');
        setIsConnected(true);
      });

      webrtc.onParticipantLeft((userId) => {
        console.log('Participant left:', userId);
        setParticipants(prev => {
          const updated = new Map(prev);
          updated.delete(userId);
          return updated;
        });
        if (updated.size === 0) {
          setConnectionState('disconnected');
          setIsConnected(false);
        }
      });

      // Start listening for connections
      webrtc.listenForSignalingMessages();
      
      // Set timeout for connection
      setTimeout(() => {
        if (connectionState === 'connecting') {
          console.log('Connection timeout, retrying...');
          handleLeaveDiscussion();
          toast.error('Connection timeout. Please try again.');
        }
      }, 30000); // 30 seconds timeout
      
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      setConnectionState('failed');
      toast.error('Failed to initialize video chat. Please check your camera and microphone permissions.');
      throw error;
    }
  };

  const handleLeaveDiscussion = async () => {
    try {
      setConnectionState('disconnecting');
      
      if (webrtcRef.current) {
        await webrtcRef.current.disconnect();
      }

      if (room) {
        const roomRef = doc(db, 'rooms', room.id);
        const roomData = (await roomRef.get()).data();
        
        if (roomData) {
          // Remove current user from participants
          const updatedParticipants = roomData.participants.filter(
            p => p.uid !== user.uid
          );
          
          await updateDoc(roomRef, {
            participants: updatedParticipants,
            status: updatedParticipants.length < 2 ? 'ended' : 'active',
            endedAt: serverTimestamp(),
          });
        }
      }

      // Cleanup
      if (roomUnsubscribeRef.current) {
        roomUnsubscribeRef.current();
        roomUnsubscribeRef.current = null;
      }

      setRoom(null);
      setIsInRoom(false);
      setIsFinding(false);
      setParticipants(new Map());
      setIsConnected(false);
      setConnectionState('disconnected');
      
    } catch (error) {
      console.error('Error leaving discussion:', error);
      toast.error('Error leaving discussion. Please try again.');
    }
  };

  const toggleVideo = async () => {
    try {
      await webrtcRef.current?.toggleVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  const toggleAudio = async () => {
    try {
      await webrtcRef.current?.toggleAudio(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.disconnect();
      }
      if (roomUnsubscribeRef.current) {
        roomUnsubscribeRef.current();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {!isInRoom ? (
        <TopicSelector
          onTopicSelect={setSelectedTopic}
          selectedTopic={selectedTopic}
          filters={filters}
          setFilters={setFilters}
          role={role}
          setRole={setRole}
          onFindPartner={findDiscussion}
          isFinding={isFinding}
        />
      ) : (
        <div className="flex flex-col h-full bg-gray-900">
          <div className="flex-1 grid grid-cols-2 gap-4 p-4">
            {/* Local video */}
            <div className="relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                You
              </div>
              {connectionState !== 'connected' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white text-center">
                    <div className="mb-2">
                      {connectionState === 'connecting' && 'Connecting...'}
                      {connectionState === 'initializing' && 'Initializing...'}
                      {connectionState === 'failed' && 'Connection failed'}
                    </div>
                    {connectionState === 'failed' && (
                      <button
                        onClick={() => initializeWebRTC(room.id)}
                        className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Remote videos */}
            {Array.from(participants.entries()).map(([userId, stream]) => (
              <div key={userId} className="relative">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-lg"
                  ref={el => {
                    if (el) el.srcObject = stream;
                  }}
                />
                <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  Participant
                </div>
              </div>
            ))}
          </div>

          {/* Video controls */}
          <VideoControls
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onLeave={handleLeaveDiscussion}
          />
        </div>
      )}
    </div>
  );
};

export default VideoChat; 