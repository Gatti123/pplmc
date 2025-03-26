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
  const [status, setStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');

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
            await initializeWebRTC();
            
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

  const initializeWebRTC = async () => {
    if (!user || !room) return;

    console.log('Initializing WebRTC connection...');
    
    try {
      setStatus('connecting');
      
      // Create WebRTC manager instance
      const webRTC = new WebRTCManager({
        onConnectionStateChange: handleConnectionStateChange,
        onRemoteStream: handleRemoteStream,
        roomId: room.id,
        userId: user.uid,
      });
      
      webrtcManager.current = webRTC;
      
      // Initialize media
      console.log('Initializing local media with devices:', selectedDevices);
      await webRTC.initializeMedia({
        audio: { deviceId: selectedDevices.audio },
        video: { deviceId: selectedDevices.video }
      });
      
      // Set local stream to state to display in UI
      remoteStreamRef.current = webRTC.getLocalStream();
      console.log('Local stream initialized:', webRTC.getLocalStream().id);
      
      // Listen for signaling messages
      console.log('Setting up signaling message listener');
      const unsubscribe = webRTC.listenForSignalingMessages();
      
      setConnectionState('connected');
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to initialize video chat. Please try again.');
    }
  };

  const handleConnectionStateChange = (state) => {
    console.log('WebRTC connection state changed to:', state);
    
    switch (state) {
      case 'connected':
        setStatus('connected');
        break;
      case 'disconnected':
      case 'failed':
        setStatus('error');
        setErrorMessage('Connection lost. Please try again.');
        break;
      case 'connecting':
        setStatus('connecting');
        break;
      default:
        // Keep current status
        break;
    }
  };

  const handleRemoteStream = (stream) => {
    console.log('Received remote stream:', stream);
    remoteStreamRef.current = stream;
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
    <>
      <header className="header">
        <div className="header-content">
          <h1 className="text-xl font-bold text-gray-900">Polemica</h1>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.displayName}</span>
            </div>
          )}
        </div>
      </header>

      <main className="mt-16">
        {showDeviceCheck ? (
          <DeviceCheck onDeviceSelect={handleDeviceSelect} />
        ) : !isInRoom ? (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Discussion Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Language Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={filters.language}
                    onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                    className="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    {[
                      { code: 'en', name: 'English' },
                      { code: 'es', name: 'Spanish' },
                      { code: 'fr', name: 'French' },
                      { code: 'ru', name: 'Russian' }
                    ].map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Region Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                  <select
                    value={filters.continent}
                    onChange={(e) => setFilters({ ...filters, continent: e.target.value })}
                    className="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    {[
                      { code: 'any', name: 'Any Region' },
                      { code: 'na', name: 'North America' },
                      { code: 'eu', name: 'Europe' },
                      { code: 'as', name: 'Asia' }
                    ].map((continent) => (
                      <option key={continent.code} value={continent.code}>
                        {continent.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    {[
                      { id: 'participant', name: 'Participant' },
                      { id: 'observer', name: 'Observer' }
                    ].map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {selectedTopic && (
                <button
                  onClick={findDiscussion}
                  disabled={isFinding}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                >
                  {isFinding ? 'Finding partner...' : 'Start Discussion'}
                </button>
              )}
            </div>
            
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
        ) : (
          <div className="max-w-6xl mx-auto px-4">
            {/* Connection status */}
            <div className="mb-4 flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionState === 'connected' ? 'bg-green-500' :
                  connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {connectionState === 'connected' ? 'Connected' :
                   connectionState === 'connecting' ? 'Connecting...' :
                   'Disconnected'}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Topic: {room?.data?.topic}
                </span>
                <ChatTimer />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local video */}
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                  You
                </div>
              </div>

              {/* Remote video */}
              {remoteStreamRef.current && (
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={remoteStreamRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                    Partner
                  </div>
                </div>
              )}
            </div>

            <VideoControls
              isVideoEnabled={isVideoEnabled}
              isAudioEnabled={isAudioEnabled}
              onToggleVideo={toggleVideo}
              onToggleAudio={toggleAudio}
              onLeave={handleLeaveDiscussion}
            />
          </div>
        )}
      </main>
    </>
  );
};

const ChatTimer = () => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span className="text-sm text-gray-600">
      Duration: {formatTime(duration)}
    </span>
  );
};

export default VideoChat; 