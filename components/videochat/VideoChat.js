import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { collection, doc, getDoc, onSnapshot, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '@/contexts';
import TopicSelector from './TopicSelector';
import VideoControls from './VideoControls';
import DeviceCheck from './DeviceCheck';
import { WebRTCManager } from '../../lib/webrtc';
import { toast } from 'react-toastify';

// Default filters
const DEFAULT_FILTERS = {
  language: 'en',
  continent: 'any'
};

// Default roles
const DEFAULT_ROLE = 'participant';

const VideoChat = () => {
  // Auth and router
  const { user } = useAuth();
  const router = useRouter();
  
  // User selections
  const [selectedTopic, setSelectedTopic] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [role, setRole] = useState(DEFAULT_ROLE);
  
  // Room and connection state
  const [room, setRoom] = useState(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  
  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState(null);
  const [showDeviceCheck, setShowDeviceCheck] = useState(true);
  
  // WebRTC
  const webRTCManager = useRef(null);
  const roomRef = useRef(null);
  const signalingUnsubscribe = useRef(null);

  // Set browser language as default
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const browserLang = navigator.language.split('-')[0];
      if (['en', 'es', 'fr', 'de', 'ru', 'zh'].includes(browserLang)) {
        setFilters(prev => ({ ...prev, language: browserLang }));
      }
    }
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (signalingUnsubscribe.current) {
        signalingUnsubscribe.current();
      }
      
      // Clean up WebRTC
      if (webRTCManager.current) {
        webRTCManager.current.cleanup();
      }
      
      // Clean up local media
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  // Handle device selection
  const handleDeviceSelect = (devices) => {
    setSelectedDevices(devices);
    setShowDeviceCheck(false);
  };

  // Find discussion partner
  const findDiscussion = async () => {
    if (!user || !selectedTopic) return;
    
    try {
      setIsFinding(true);
      
      // Search for rooms based on selected filters
      const roomsCollection = collection(db, 'rooms');
      const waitingRoomsQuery = query(
        roomsCollection,
        where('status', '==', 'waiting'),
        where('topic', '==', selectedTopic),
        where('language', '==', filters.language)
      );
      
      // Listen for any changes to the query
      const unsubscribe = onSnapshot(waitingRoomsQuery, async (snapshot) => {
        let foundRoom = null;
        
        // Filter rooms further
        for (const doc of snapshot.docs) {
          const roomData = doc.data();
          
          // Skip rooms created by the current user
          if (roomData.createdBy === user.uid) continue;
          
          // Apply continent filter if not 'any'
          if (filters.continent !== 'any' && roomData.continent !== filters.continent) continue;
          
          // Found a suitable room
          foundRoom = { id: doc.id, ...roomData };
          break;
        }
        
        if (foundRoom) {
          // Join existing room
          const roomRef = doc(db, 'rooms', foundRoom.id);
          await updateDoc(roomRef, {
            status: 'active',
            participants: [...(foundRoom.participants || []), {
              uid: user.uid,
              displayName: user.displayName,
              role: role,
              joinedAt: serverTimestamp()
            }],
            updatedAt: serverTimestamp()
          });
          
          setRoom(foundRoom);
          setIsInRoom(true);
        } else {
          // Create new room
          const newRoom = {
            topic: selectedTopic,
            language: filters.language,
            continent: filters.continent,
            status: 'waiting',
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            participants: [{
              uid: user.uid,
              displayName: user.displayName,
              role: role,
              joinedAt: serverTimestamp()
            }]
          };
          
          // Add the new room to Firestore
          const newRoomRef = doc(collection(db, 'rooms'));
          await updateDoc(newRoomRef, newRoom);
          setRoom({ id: newRoomRef.id, ...newRoom });
          
          // Set up a listener for the room
          setupRoomListener(newRoomRef.id);
        }
        
        // Unsubscribe as we've found or created a room
        unsubscribe();
        setIsFinding(false);
      }, (error) => {
        console.error('Error finding rooms:', error);
        setIsFinding(false);
        toast.error('Error finding discussion partner. Please try again.');
      });
    } catch (error) {
      console.error('Error in findDiscussion:', error);
      setIsFinding(false);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  // Set up a listener for room updates
  const setupRoomListener = (roomId) => {
    const roomRef = doc(db, 'rooms', roomId);
    
    return onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Room was deleted
        toast.info('The discussion room has been closed');
        setIsInRoom(false);
        setRoom(null);
        return;
      }
      
      const roomData = snapshot.data();
      setRoom({ id: snapshot.id, ...roomData });
      
      // If room status changed to active and there are 2 participants
      if (roomData.status === 'active' && roomData.participants?.length >= 2) {
        // Initialize WebRTC connection
        initializeWebRTC();
      }
    });
  };

  // Initialize WebRTC
  const initializeWebRTC = async () => {
    if (!user || !room) return;
    
    try {
      setConnectionState('connecting');
      
      // Create WebRTC manager
      webRTCManager.current = new WebRTCManager({
        roomId: room.id,
        userId: user.uid,
        signaling: {
          sendMessage: async (message) => {
            // Send signaling message to room
            const signalRef = doc(collection(db, `rooms/${room.id}/signals`));
            await updateDoc(signalRef, {
              from: user.uid,
              message,
              createdAt: serverTimestamp()
            });
          }
        },
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onConnectionStateChange: (state) => {
          setConnectionState(state);
        }
      });
      
      // Initialize local media
      await webRTCManager.current.initializeMedia({
        audio: { deviceId: selectedDevices.audio },
        video: { deviceId: selectedDevices.video }
      });
      
      // Set local stream
      setLocalStream(webRTCManager.current.getLocalStream());
      
      // Listen for signaling messages
      signalingUnsubscribe.current = onSnapshot(
        collection(db, `rooms/${room.id}/signals`),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const signal = change.doc.data();
              if (signal.from !== user.uid) {
                webRTCManager.current.handleSignalingMessage(signal.message);
              }
            }
          });
        }
      );
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      setConnectionState('error');
      toast.error('Failed to establish video connection. Please try again.');
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  // Leave room
  const leaveRoom = async () => {
    if (room) {
      try {
        // Clean up media
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        
        // Clean up WebRTC
        if (webRTCManager.current) {
          webRTCManager.current.cleanup();
        }
        
        // Remove user from room participants
        const roomRef = doc(db, 'rooms', room.id);
        const roomSnapshot = await getDoc(roomRef);
        
        if (roomSnapshot.exists()) {
          const roomData = roomSnapshot.data();
          const updatedParticipants = roomData.participants.filter(
            p => p.uid !== user.uid
          );
          
          if (updatedParticipants.length === 0) {
            // Delete the room if no participants left
            await updateDoc(roomRef, { status: 'closed' });
          } else {
            // Update participants list
            await updateDoc(roomRef, { 
              participants: updatedParticipants,
              updatedAt: serverTimestamp()
            });
          }
        }
        
        // Reset state
        setRoom(null);
        setIsInRoom(false);
        setLocalStream(null);
        setRemoteStream(null);
        setConnectionState('disconnected');
        
        if (signalingUnsubscribe.current) {
          signalingUnsubscribe.current();
        }
      } catch (error) {
        console.error('Error leaving room:', error);
        toast.error('Error leaving the room. Please try again.');
      }
    }
  };

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
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-3 h-3 rounded-full ${
                  connectionState === 'connected' ? 'bg-green-500' :
                  connectionState === 'connecting' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></span>
                <span className="text-gray-600">
                  {connectionState === 'connected' ? 'Connected' :
                   connectionState === 'connecting' ? 'Connecting...' :
                   'Disconnected'}
                </span>
              </div>
              <button
                onClick={leaveRoom}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Leave Discussion
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Video */}
              <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative">
                {localStream && (
                  <video
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                    ref={(el) => {
                      if (el && localStream) el.srcObject = localStream;
                    }}
                  ></video>
                )}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <VideoControls
                    audioEnabled={audioEnabled}
                    videoEnabled={videoEnabled}
                    toggleAudio={toggleAudio}
                    toggleVideo={toggleVideo}
                  />
                </div>
              </div>
              
              {/* Remote Video */}
              <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                {remoteStream ? (
                  <video
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el && remoteStream) el.srcObject = remoteStream;
                    }}
                  ></video>
                ) : (
                  <div className="text-white text-center p-4">
                    {connectionState === 'connecting' ? 
                      'Connecting to your partner...' : 
                      'Waiting for partner to join...'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default VideoChat; 