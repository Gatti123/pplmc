import { useState, useEffect, useRef, useContext } from 'react';
import { connect, createLocalVideoTrack } from 'twilio-video';
import { UserContext } from '../../context/UserContext';
import { db, updateUserOnlineStatus } from '../../lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, onSnapshot, query, where, serverTimestamp, arrayUnion, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import VideoControls from './VideoControls';
import TextChat from './TextChat';
import TopicSelector from './TopicSelector';
import DiscussionTimer from './DiscussionTimer';
import { v4 as uuidv4 } from 'uuid';

const VideoChat = () => {
  const { user } = useContext(UserContext);
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [localTrack, setLocalTrack] = useState(null);
  const [isFinding, setIsFinding] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [filters, setFilters] = useState({
    language: navigator.language.split('-')[0] || 'en',
    continent: 'any',
  });
  const [role, setRole] = useState('participant'); // participant or observer
  const [timerDuration, setTimerDuration] = useState(10); // 10 minutes by default
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [roomDetails, setRoomDetails] = useState(null);
  
  const localVideoRef = useRef(null);
  const roomUnsubscribeRef = useRef(null);
  
  // Initialize local video
  useEffect(() => {
    if (!user) return;
    
    const initializeLocalVideo = async () => {
      try {
        const track = await createLocalVideoTrack({
          width: 640,
          height: 480,
          frameRate: 24,
        });
        setLocalTrack(track);
        
        if (localVideoRef.current) {
          localVideoRef.current.appendChild(track.attach());
        }
      } catch (error) {
        console.error('Error creating local video track:', error);
        toast.error('Could not access camera. Please check your permissions.');
      }
    };
    
    initializeLocalVideo();
    
    return () => {
      if (localTrack) {
        localTrack.stop();
        setLocalTrack(null);
        
        if (localVideoRef.current) {
          localVideoRef.current.innerHTML = '';
        }
      }
    };
  }, [user]);
  
  // Handle participants
  useEffect(() => {
    if (!room) return;
    
    const participantConnected = (participant) => {
      setParticipants((prevParticipants) => [...prevParticipants, participant]);
    };
    
    const participantDisconnected = (participant) => {
      setParticipants((prevParticipants) =>
        prevParticipants.filter((p) => p !== participant)
      );
      
      toast.info(`${participant.identity} has left the discussion.`);
    };
    
    room.on('participantConnected', participantConnected);
    room.on('participantDisconnected', participantDisconnected);
    
    // Get existing participants
    room.participants.forEach(participantConnected);
    
    return () => {
      room.off('participantConnected', participantConnected);
      room.off('participantDisconnected', participantDisconnected);
    };
  }, [room]);
  
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
      
      // If there's an available room, join it
      if (!querySnapshot.empty) {
        console.log('Found existing room to join');
        const existingRoom = querySnapshot.docs[0];
        roomRef = doc(db, 'rooms', existingRoom.id);
        
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
        const roomId = uuidv4();
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
        
        // If room is active and has two participants, connect to the room
        if (data.status === 'active' && data.participants?.length === 2 && !isInRoom) {
          console.log('Connecting to room - conditions met:', {
            status: data.status,
            participantsCount: data.participants.length,
            isInRoom
          });
          await connectToRoom(data.roomId);
          
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
  
  // Connect to a Twilio room
  const connectToRoom = async (roomId) => {
    try {
      console.log('Requesting Twilio token for room:', roomId);
      // Get Twilio token from server
      const response = await fetch('/api/get-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: user.uid,
          room: roomId,
        }),
      });
      
      const { token } = await response.json();
      console.log('Received Twilio token, connecting to room...');
      
      // Connect to Twilio room
      const twilioRoom = await connect(token, {
        name: roomId,
        audio: true,
        video: { width: 640, height: 480 },
        dominantSpeaker: true,
      });
      
      console.log('Connected to Twilio room successfully');
      setRoom(twilioRoom);
      setIsInRoom(true);
      setIsFinding(false);
      setIsTimerActive(true);
      
      toast.success('Connected to discussion!');
    } catch (error) {
      console.error('Error connecting to room:', error);
      toast.error('Error connecting to discussion. Please try again.');
      setIsFinding(false);
    }
  };
  
  // Leave the discussion
  const leaveDiscussion = async () => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setParticipants([]);
      setIsInRoom(false);
      setIsTimerActive(false);
      setMessages([]);
    }
    
    if (roomUnsubscribeRef.current) {
      roomUnsubscribeRef.current();
      roomUnsubscribeRef.current = null;
    }
    
    if (roomDetails) {
      // Update room status in Firestore
      try {
        const roomDoc = await getDoc(doc(db, 'rooms', roomDetails.id));
        if (roomDoc.exists()) {
          await updateDoc(doc(db, 'rooms', roomDetails.id), {
            status: 'ended',
            endedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        console.error('Error updating room status:', error);
      }
      
      setRoomDetails(null);
    }
    
    toast.info('You have left the discussion.');
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
  
  // Update online status when component mounts/unmounts
  useEffect(() => {
    if (!user) return;

    // Set user as online
    updateUserOnlineStatus(user.uid, true);

    // Set user as offline when component unmounts
    return () => {
      updateUserOnlineStatus(user.uid, false);
    };
  }, [user]);
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {!isInRoom ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-primary mb-6">Start a Discussion</h1>
            
            <div className="mb-6">
              <TopicSelector
                selectedTopic={selectedTopic}
                setSelectedTopic={setSelectedTopic}
              />
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    value={filters.language}
                    onChange={(e) =>
                      setFilters({ ...filters, language: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ru">Russian</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Continent
                  </label>
                  <select
                    value={filters.continent}
                    onChange={(e) =>
                      setFilters({ ...filters, continent: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="any">Any</option>
                    <option value="north_america">North America</option>
                    <option value="south_america">South America</option>
                    <option value="europe">Europe</option>
                    <option value="asia">Asia</option>
                    <option value="africa">Africa</option>
                    <option value="oceania">Oceania</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Role</h2>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="participant"
                    checked={role === 'participant'}
                    onChange={() => setRole('participant')}
                    className="form-radio text-primary"
                  />
                  <span className="ml-2">Participant</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="observer"
                    checked={role === 'observer'}
                    onChange={() => setRole('observer')}
                    className="form-radio text-primary"
                  />
                  <span className="ml-2">Observer</span>
                </label>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Timer</h2>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="timer"
                    value="5"
                    checked={timerDuration === 5}
                    onChange={() => setTimerDuration(5)}
                    className="form-radio text-primary"
                  />
                  <span className="ml-2">5 minutes</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="timer"
                    value="10"
                    checked={timerDuration === 10}
                    onChange={() => setTimerDuration(10)}
                    className="form-radio text-primary"
                  />
                  <span className="ml-2">10 minutes</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="timer"
                    value="15"
                    checked={timerDuration === 15}
                    onChange={() => setTimerDuration(15)}
                    className="form-radio text-primary"
                  />
                  <span className="ml-2">15 minutes</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={findDiscussion}
                disabled={isFinding || !selectedTopic}
                className="btn-primary px-8 py-3 text-lg flex items-center"
              >
                {isFinding ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Finding a partner...
                  </>
                ) : (
                  'Find Discussion Partner'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-primary">
                    Discussion: {roomDetails?.topic}
                  </h2>
                  
                  {isTimerActive && (
                    <DiscussionTimer
                      duration={timerDuration}
                      onTimerEnd={handleTimerEnd}
                    />
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <div className="aspect-w-16 aspect-h-9 relative">
                      <div ref={localVideoRef} className="w-full h-full"></div>
                      <div className="absolute bottom-2 left-2 bg-primary text-white px-2 py-1 rounded text-sm">
                        You ({role})
                      </div>
                    </div>
                  </div>
                  
                  {participants.map((participant) => (
                    <div key={participant.sid} className="bg-gray-100 rounded-lg overflow-hidden">
                      <div className="aspect-w-16 aspect-h-9 relative">
                        <ParticipantVideo participant={participant} />
                        <div className="absolute bottom-2 left-2 bg-primary text-white px-2 py-1 rounded text-sm">
                          {participant.identity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <VideoControls
                  room={room}
                  onLeave={leaveDiscussion}
                />
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <TextChat
                messages={messages}
                onSendMessage={sendMessage}
                disabled={role === 'observer'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Participant Video Component
const ParticipantVideo = ({ participant }) => {
  const [videoTrack, setVideoTrack] = useState(null);
  const [audioTrack, setAudioTrack] = useState(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  
  const trackSubscribed = (track) => {
    if (track.kind === 'video') {
      setVideoTrack(track);
    } else if (track.kind === 'audio') {
      setAudioTrack(track);
    }
  };
  
  const trackUnsubscribed = (track) => {
    if (track.kind === 'video') {
      setVideoTrack(null);
    } else if (track.kind === 'audio') {
      setAudioTrack(null);
    }
  };
  
  useEffect(() => {
    const trackSubscription = (track) => {
      if (track.isSubscribed) {
        trackSubscribed(track);
      }
      track.on('subscribed', trackSubscribed);
      track.on('unsubscribed', trackUnsubscribed);
    };
    
    participant.tracks.forEach((publication) => {
      trackSubscription(publication);
    });
    
    participant.on('trackPublished', trackSubscription);
    participant.on('trackUnpublished', trackUnsubscribed);
    
    return () => {
      participant.removeAllListeners();
      if (videoTrack) {
        videoTrack.detach();
      }
      if (audioTrack) {
        audioTrack.detach();
      }
    };
  }, [participant]);
  
  useEffect(() => {
    if (videoTrack && videoRef.current) {
      const videoElement = videoTrack.attach();
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoRef.current.innerHTML = '';
      videoRef.current.appendChild(videoElement);
    }
    
    return () => {
      if (videoTrack) {
        videoTrack.detach();
      }
    };
  }, [videoTrack]);
  
  useEffect(() => {
    if (audioTrack && audioRef.current) {
      const audioElement = audioTrack.attach();
      audioRef.current.innerHTML = '';
      audioRef.current.appendChild(audioElement);
    }
    
    return () => {
      if (audioTrack) {
        audioTrack.detach();
      }
    };
  }, [audioTrack]);
  
  return (
    <>
      <div ref={videoRef} className="w-full h-full"></div>
      <div ref={audioRef} className="hidden"></div>
    </>
  );
};

export default VideoChat; 