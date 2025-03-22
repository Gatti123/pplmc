import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import WebRTCManager from '../../lib/webrtc';
import VideoControls from './VideoControls';
import { db } from '../../lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
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
    console.log('Starting search with filters:', { topic: selectedTopic, language: filters.language, role });
    
    try {
      // Check for available rooms with the same topic and filters
      const roomsRef = collection(db, 'rooms');
      const roomsQuery = query(
        roomsRef,
        where('topic', '==', selectedTopic),
        where('status', '==', 'waiting'),
        where('language', '==', filters.language)
      );

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
    // Clean up any existing listener
    if (roomUnsubscribeRef.current) {
      roomUnsubscribeRef.current();
    }

    // Set up new listener
    const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
      const data = snapshot.data();
      console.log('Room update received:', data);

      if (!data) {
        console.log('Room was deleted or does not exist');
        handleLeaveDiscussion();
        return;
      }

      // If room is active and has two participants, initialize WebRTC
      if (data.status === 'active' && data.participants?.length === 2) {
        console.log('Room is active with 2 participants, initializing WebRTC');
        if (!isInRoom) {
          setIsInRoom(true);
          setIsFinding(false);
          initializeWebRTC(snapshot.id);
          
          // Update user's recent discussions
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              recentDiscussions: arrayUnion({
                roomId: snapshot.id,
                topic: data.topic,
                timestamp: new Date().toISOString(),
                participants: data.participants,
              }),
            });
            console.log('Updated user recent discussions');
          } catch (error) {
            console.error('Error updating recent discussions:', error);
          }
        }
      } else if (data.status === 'ended') {
        console.log('Room ended, cleaning up');
        handleLeaveDiscussion();
      }
    }, (error) => {
      console.error('Error in room listener:', error);
      toast.error('Lost connection to room. Please try again.');
      handleLeaveDiscussion();
    });
    
    roomUnsubscribeRef.current = unsubscribe;
    console.log('Room listener set up');
  };

  const initializeWebRTC = async (roomId) => {
    try {
      // Create WebRTC manager instance
      const webrtc = new WebRTCManager(roomId, user.uid, db);
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
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      toast.error('Failed to initialize video chat. Please check your camera and microphone permissions.');
    }
  };

  const handleLeaveDiscussion = async () => {
    try {
      if (webrtcRef.current) {
        await webrtcRef.current.disconnect();
      }

      if (room) {
        // Update room status
        await updateDoc(doc(db, 'rooms', room.id), {
          status: 'ended',
          endedAt: serverTimestamp(),
        });
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