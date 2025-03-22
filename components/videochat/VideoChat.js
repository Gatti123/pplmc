import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import WebRTCManager from '../../lib/webrtc';
import VideoControls from './VideoControls';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

const VideoChat = ({ room, onLeave }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const webrtcRef = useRef(null);
  const localVideoRef = useRef(null);

  useEffect(() => {
    if (!user || !room) return;

    const initializeWebRTC = async () => {
      try {
        // Create WebRTC manager instance
        const webrtc = new WebRTCManager(room.id, user.uid, db);
        webrtcRef.current = webrtc;

        // Initialize local media
        const localStream = await webrtc.initializeMedia(true, true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Handle remote participants
        webrtc.onTrack((userId, stream) => {
          setParticipants(prev => new Map(prev).set(userId, stream));
        });

        webrtc.onParticipantLeft((userId) => {
          setParticipants(prev => {
            const updated = new Map(prev);
            updated.delete(userId);
            return updated;
          });
        });

        // Start listening for connections
        webrtc.listenForSignalingMessages();
        setIsConnected(true);

        // Update room status in Firestore
        await db.collection('rooms').doc(room.id).collection('participants').doc(user.uid).set({
          userId: user.uid,
          joinedAt: Date.now(),
        });

      } catch (error) {
        console.error('Error initializing WebRTC:', error);
        alert('Failed to initialize video chat. Please check your camera and microphone permissions.');
      }
    };

    initializeWebRTC();

    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.disconnect();
      }
    };
  }, [user, room]);

  const handleLeaveDiscussion = async () => {
    try {
      if (webrtcRef.current) {
        await webrtcRef.current.disconnect();
      }

      // Remove participant from room
      await db.collection('rooms').doc(room.id).collection('participants').doc(user.uid).delete();

      if (onLeave) {
        onLeave();
      }
    } catch (error) {
      console.error('Error leaving discussion:', error);
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

  return (
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
  );
};

export default VideoChat; 