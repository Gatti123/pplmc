import { useState, useEffect, useRef, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, onSnapshot, query, where, serverTimestamp, arrayUnion, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import VideoControls from './VideoControls';
import TextChat from './TextChat';
import TopicSelector from './TopicSelector';
import DiscussionTimer from './DiscussionTimer';
import { v4 as uuidv4 } from 'uuid';
import { config, createClient, createMicrophoneAndCameraTracks } from '../../lib/agora';

const VideoChat = () => {
  const { user } = useContext(UserContext);
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [client, setClient] = useState(null);
  const [ready, setReady] = useState(false);
  const [tracks, setTracks] = useState(null);
  const [isFinding, setIsFinding] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [filters, setFilters] = useState({
    language: 'en',
    continent: 'any',
  });
  const [role, setRole] = useState('participant');
  const [timerDuration, setTimerDuration] = useState(10);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [roomDetails, setRoomDetails] = useState(null);
  const [users, setUsers] = useState([]);
  const [start, setStart] = useState(false);
  
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

  // Initialize Agora client
  useEffect(() => {
    let mounted = true;

    const initClient = async () => {
      if (typeof window !== 'undefined') {
        const agoraClient = createClient();
        if (agoraClient && mounted) {
          setClient(agoraClient);
        }
      }
    };

    initClient();

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize tracks
  useEffect(() => {
    let mounted = true;

    const initTracks = async () => {
      if (typeof window !== 'undefined' && !tracks) {
        try {
          const { tracks: newTracks, ready: isReady } = await createMicrophoneAndCameraTracks();
          if (mounted && isReady && newTracks) {
            setTracks(newTracks);
            setReady(true);
          }
        } catch (error) {
          console.error('Error initializing tracks:', error);
          if (mounted) {
            toast.error('Failed to access camera or microphone. Please check your permissions.');
          }
        }
      }
    };

    initTracks();

    return () => {
      mounted = false;
      if (tracks) {
        tracks.forEach((track) => {
          track.close();
        });
      }
    };
  }, []);

  // Handle Agora events and room connection
  useEffect(() => {
    if (!client || !room || !user) return;

    let mounted = true;

    const init = async () => {
      try {
        // Setup event handlers
        client.on("user-published", async (user, mediaType) => {
          if (!mounted) return;
          await client.subscribe(user, mediaType);
          
          if (mediaType === "video") {
            setUsers((prevUsers) => [...prevUsers.filter(u => u.uid !== user.uid), user]);
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });

        client.on("user-unpublished", (user, mediaType) => {
          if (!mounted) return;
          if (mediaType === "audio") {
            user.audioTrack?.stop();
          }
          if (mediaType === "video") {
            setUsers((prevUsers) => prevUsers.filter((User) => User.uid !== user.uid));
          }
        });

        client.on("user-left", (user) => {
          if (!mounted) return;
          setUsers((prevUsers) => prevUsers.filter((User) => User.uid !== user.uid));
          toast.info(`A participant has left the discussion.`);
        });

        // Join the channel
        await client.join(config.appId, room, config.token, user.uid);
        console.log('Successfully joined Agora channel:', room);

        // Publish local tracks if available
        if (tracks) {
          await client.publish(tracks);
          setStart(true);
          console.log('Local tracks published successfully');
        }
      } catch (error) {
        console.error("Error in Agora initialization:", error);
        if (mounted) {
          toast.error("Failed to join the discussion room. Please try again.");
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (client) {
        client.removeAllListeners();
      }
    };
  }, [client, room, tracks, user]);

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
      const roomsQuery = query(
        collection(db, 'rooms'),
        where('topic', '==', selectedTopic),
        where('status', '==', 'waiting'),
        where('language', '==', filters.language)
      );

      const querySnapshot = await getDocs(roomsQuery);
      console.log('Found waiting rooms:', querySnapshot.size);
      
      let roomRef;
      let roomId;
      
      // If there's an available room, join it
      if (!querySnapshot.empty) {
        console.log('Found existing room to join');
        const existingRoom = querySnapshot.docs[0];
        roomRef = doc(db, 'rooms', existingRoom.id);
        roomId = existingRoom.data().roomId;
        
        // Update room with new participant
        await updateDoc(roomRef, {
          status: 'active',
          participants: arrayUnion({
            uid: user.uid,
            displayName: user.displayName,
            role: role,
          }),
        });
        console.log('Joined existing room:', existingRoom.id);
      } else {
        console.log('Creating new room');
        // Create a new room if no matching room is found
        roomId = uuidv4();
        roomRef = await addDoc(collection(db, 'rooms'), {
          roomId,
          topic: selectedTopic,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          participants: [
            {
              uid: user.uid,
              displayName: user.displayName,
              role: role,
            },
          ],
          status: 'waiting',
          language: filters.language,
          continent: filters.continent,
          timerDuration: timerDuration,
          isTimerActive: false,
        });
        console.log('Created new room:', roomRef.id);
      }

      setRoom(roomId);
      
      // Listen for room updates
      roomUnsubscribeRef.current = onSnapshot(doc(db, 'rooms', roomRef.id), async (snapshot) => {
        const data = snapshot.data();
        console.log('Room update:', { 
          roomId: roomRef.id, 
          status: data.status, 
          participantsCount: data.participants?.length,
          participants: data.participants 
        });
        setRoomDetails(data);
        
        // If room is active and has two participants, set isInRoom
        if (data.status === 'active' && data.participants?.length === 2 && !isInRoom) {
          setIsInRoom(true);
          
          // Update user's recent discussions
          await updateDoc(doc(db, 'users', user.uid), {
            recentDiscussions: arrayUnion({
              roomId: data.roomId,
              topic: data.topic,
              timestamp: new Date().toISOString(),
              participants: data.participants,
            }),
          });
        }
      });
      
      toast.info('Looking for a discussion partner...');
    } catch (error) {
      console.error('Error finding discussion:', error);
      toast.error('Error finding discussion. Please try again.');
      setIsFinding(false);
    }
  };

  const leaveDiscussion = async () => {
    if (roomDetails) {
      try {
        // Update room status in Firebase
        const roomRef = doc(db, 'rooms', roomDetails.id);
        await updateDoc(roomRef, {
          status: 'ended',
          endedAt: serverTimestamp(),
        });

        // Leave Agora channel
        await client.leave();
        client.removeAllListeners();
        tracks.forEach((track) => {
          track.close();
        });
        setUsers([]);
        setStart(false);
        setRoom(null);
        setIsInRoom(false);
        
        if (roomUnsubscribeRef.current) {
          roomUnsubscribeRef.current();
        }
        
        toast.success('Left the discussion successfully.');
      } catch (error) {
        console.error('Error leaving discussion:', error);
        toast.error('Error leaving discussion. Please try again.');
      }
    }
  };

  // Send a chat message
  const sendMessage = async (text) => {
    if (!room || !text.trim()) return;
    
    const messageData = {
      text,
      sender: {
        uid: user.uid,
        displayName: user.displayName,
      },
      timestamp: new Date().toISOString(),
    };
    
    // Add message to local state
    setMessages((prevMessages) => [...prevMessages, messageData]);
    
    // Send message to room data channel
    room.localParticipant.publishData({ message: JSON.stringify(messageData) });
    
    // Store message in Firestore
    try {
      await addDoc(collection(db, 'rooms', roomDetails.id, 'messages'), messageData);
    } catch (error) {
      console.error('Error storing message:', error);
    }
  };
  
  // Handle timer end
  const handleTimerEnd = () => {
    toast.info('Discussion time has ended. You can continue or find a new partner.');
    setIsTimerActive(false);
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div className="relative">
            {ready && tracks && (
              <div className="w-full h-64 bg-black rounded-lg overflow-hidden">
                <div ref={(ref) => {
                  if (ref && tracks[1]) {
                    tracks[1].play(ref);
                  }
                }} className="w-full h-full"></div>
              </div>
            )}
          </div>
          
          {users.length > 0 && users.map((user) => (
            <div key={user.uid} className="w-full h-64 bg-black rounded-lg overflow-hidden">
              <div ref={(ref) => {
                if (ref && user.videoTrack) {
                  user.videoTrack.play(ref);
                }
              }} className="w-full h-full"></div>
            </div>
          ))}

          <div className="col-span-2">
            <VideoControls
              onLeaveDiscussion={leaveDiscussion}
              tracks={tracks}
            />
          </div>

          {roomDetails && (
            <>
              <DiscussionTimer
                duration={roomDetails.timerDuration}
                isActive={roomDetails.isTimerActive}
                onTimerEnd={handleTimerEnd}
              />
              <TextChat
                messages={messages}
                onSendMessage={sendMessage}
                participants={roomDetails.participants}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoChat; 