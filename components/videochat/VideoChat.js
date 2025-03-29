import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { collection, doc, getDoc, onSnapshot, updateDoc, serverTimestamp, query, where, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '@/contexts';
import { useDispatch, useSelector } from 'react-redux';
import TopicSelector from './TopicSelector';
import VideoControls from './VideoControls';
import DeviceCheck from './DeviceCheck';
import { WebRTCManager } from '../../lib/webrtc';
import { toast } from 'react-toastify';
import { FaSignal, FaExclamationTriangle } from 'react-icons/fa';
import {
  setRoom,
  setFinding,
  setConnectionState,
  setConnectionQuality,
  setLocalStream,
  setRemoteStream,
  toggleAudio,
  toggleVideo,
  setSelectedDevices,
  setSelectedTopic,
  setFilters,
  setRole,
  setError,
  resetVideoChat
} from '@/store/slices/videoChatSlice';
import VideoGrid from './VideoGrid';
import RoomInfo from './RoomInfo';
import ChatMessages from './ChatMessages';

const VideoChat = () => {
  const router = useRouter();
  const { user } = useAuth();
  const dispatch = useDispatch();
  
  // Get state from Redux
  const {
    room,
    isInRoom,
    isFinding,
    connectionState,
    connectionQuality,
    connectionMetrics,
    localStream,
    remoteStream,
    audioEnabled,
    videoEnabled,
    selectedDevices,
    showDeviceCheck,
    selectedTopic,
    filters,
    role,
    error
  } = useSelector(state => state.videoChat);
  
  // WebRTC
  const webRTCManager = useRef(null);
  const roomRef = useRef(null);
  const signalingUnsubscribe = useRef(null);

  // Set browser language as default
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const browserLang = navigator.language.split('-')[0];
      if (['en', 'es', 'fr', 'de', 'ru', 'zh'].includes(browserLang)) {
        dispatch(setFilters({ language: browserLang }));
      }
    }
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (signalingUnsubscribe.current) {
        signalingUnsubscribe.current();
      }
      if (webRTCManager.current) {
        webRTCManager.current.cleanup();
      }
      dispatch(resetVideoChat());
    };
  }, [dispatch]);

  const findDiscussion = async () => {
    if (!selectedTopic || !user) return;

    try {
      dispatch(setFinding(true));

      // Create new room
      const roomRef = await addDoc(collection(db, 'rooms'), {
        topic: selectedTopic,
        createdBy: user.uid,
        status: 'waiting',
        filters,
        role,
        createdAt: new Date()
      });

      dispatch(setRoom({
        id: roomRef.id,
        topic: selectedTopic,
        createdBy: user.uid,
        status: 'waiting',
        filters,
        role
      }));

    } catch (error) {
      console.error('Error creating room:', error);
      dispatch(setError('Failed to create discussion room'));
    } finally {
      dispatch(setFinding(false));
    }
  };

  // Set up a listener for room updates
  const setupRoomListener = (roomId) => {
    const roomRef = doc(db, 'rooms', roomId);
    
    return onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Room was deleted
        toast.info('The discussion room has been closed');
        dispatch(setRoom(null));
        return;
      }
      
      const roomData = snapshot.data();
      dispatch(setRoom({ id: snapshot.id, ...roomData }));
      
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
      dispatch(setConnectionState('connecting'));
      
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
          dispatch(setRemoteStream(stream));
        },
        onConnectionStateChange: (state) => {
          dispatch(setConnectionState(state));
          if (state === 'failed') {
            toast.error('Connection failed. Attempting to reconnect...');
          } else if (state === 'connected') {
            toast.success('Connection established');
          }
        },
        onConnectionQualityChange: (quality, metrics) => {
          dispatch(setConnectionQuality({ quality, metrics }));
          
          // Show warning for poor connection
          if (quality === 'poor') {
            toast.warning('Poor connection quality detected');
          }
        }
      });
      
      // Initialize local media
      await webRTCManager.current.initializeMedia({
        audio: { deviceId: selectedDevices.audio },
        video: { deviceId: selectedDevices.video }
      });
      
      // Set local stream
      dispatch(setLocalStream(webRTCManager.current.getLocalStream()));
      
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
      dispatch(setConnectionState('error'));
      dispatch(setError('Failed to establish video connection. Please try again.'));
      toast.error('Failed to establish video connection. Please try again.');
    }
  };

  const handleDeviceSelect = (devices) => {
    dispatch(setSelectedDevices(devices));
  };

  const handleTopicSelect = (topicId) => {
    dispatch(setSelectedTopic(topicId));
  };

  const handleRoleSelect = (roleId) => {
    dispatch(setRole(roleId));
  };

  const handleFilterChange = (newFilters) => {
    dispatch(setFilters({ ...filters, ...newFilters }));
  };

  const handleToggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        dispatch(toggleAudio());
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        dispatch(toggleVideo());
      }
    }
  };

  const leaveRoom = async () => {
    if (!room || !user) return;
    
    try {
      // Update room status
      const roomRef = doc(db, 'rooms', room.id);
      await updateDoc(roomRef, {
        status: 'ended',
        endedAt: serverTimestamp()
      });
      
      // Cleanup WebRTC
      if (webRTCManager.current) {
        webRTCManager.current.cleanup();
      }
      
      // Unsubscribe from signaling
      if (signalingUnsubscribe.current) {
        signalingUnsubscribe.current();
      }
      
      // Reset state
      dispatch(resetVideoChat());
      
      toast.success('Left the discussion room');
    } catch (error) {
      console.error('Error leaving room:', error);
      dispatch(setError('Error leaving the room. Please try again.'));
      toast.error('Error leaving the room. Please try again.');
    }
  };

  // Render connection quality indicator
  const renderConnectionQuality = () => {
    if (connectionState !== 'connected') return null;

    const qualityColors = {
      good: 'text-green-500',
      fair: 'text-yellow-500',
      poor: 'text-red-500',
      unknown: 'text-gray-500'
    };

    const qualityLabels = {
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      unknown: 'Unknown'
    };

    return (
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg p-2 shadow-md">
        <div className="flex items-center space-x-2">
          <FaSignal className={`text-lg ${qualityColors[connectionQuality]}`} />
          <span className="text-sm font-medium">{qualityLabels[connectionQuality]}</span>
          {connectionQuality === 'poor' && (
            <FaExclamationTriangle className="text-yellow-500" />
          )}
        </div>
        {connectionQuality !== 'unknown' && (
          <div className="text-xs text-gray-600 mt-1">
            <div>RTT: {Math.round(connectionMetrics.rtt)}ms</div>
            <div>Packet Loss: {(connectionMetrics.packetLoss * 100).toFixed(1)}%</div>
            <div>Bandwidth: {(connectionMetrics.bandwidth / 1000).toFixed(1)}kbps</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {showDeviceCheck ? (
        <div className="flex-1 overflow-y-auto">
          <DeviceCheck />
        </div>
      ) : !isInRoom ? (
        <div className="flex-1 overflow-y-auto">
          <TopicSelector
            selectedTopic={selectedTopic}
            onTopicSelect={(topicId) => dispatch(setSelectedTopic(topicId))}
            selectedRole={role}
            onRoleSelect={(roleId) => dispatch(setRole(roleId))}
            filters={filters}
            onFilterChange={(newFilters) => dispatch(setFilters({ ...filters, ...newFilters }))}
          />
          <div className="mt-6 px-4">
            <button
              onClick={findDiscussion}
              disabled={isFinding || !selectedTopic}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
            >
              {isFinding ? 'Finding Discussion Partner...' : 'Find Discussion Partner'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <RoomInfo />
          <div className="flex-1 flex">
            <div className="flex-1">
              <VideoGrid
                localStream={localStream}
                remoteStream={remoteStream}
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                connectionState={connectionState}
                connectionQuality={connectionQuality}
                onToggleAudio={handleToggleAudio}
                onToggleVideo={handleToggleVideo}
              />
            </div>
            <div className="w-80 border-l">
              <ChatMessages />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoChat; 