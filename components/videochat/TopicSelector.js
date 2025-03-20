import { useState, useEffect, useContext } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { UserContext } from '../../context/UserContext';

const TOPICS = [
  { id: 'politics', name: 'Politics', icon: '🏛️' },
  { id: 'technology', name: 'Technology', icon: '💻' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'philosophy', name: 'Philosophy', icon: '🧠' },
  { id: 'religion', name: 'Religion', icon: '🙏' },
  { id: 'art', name: 'Art & Culture', icon: '🎨' },
  { id: 'environment', name: 'Environment', icon: '🌍' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'economics', name: 'Economics', icon: '📈' },
  { id: 'health', name: 'Health & Medicine', icon: '🏥' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'food', name: 'Food & Cuisine', icon: '🍲' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'movies', name: 'Movies & TV', icon: '🎬' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'fashion', name: 'Fashion', icon: '👗' },
  { id: 'relationships', name: 'Relationships', icon: '❤️' },
  { id: 'parenting', name: 'Parenting', icon: '👶' },
  { id: 'languages', name: 'Languages', icon: '🗣️' },
];

// Sample conversation starters for each topic
const CONVERSATION_STARTERS = {
  politics: [
    "What's your view on the role of government in society?",
    "How do you feel about the current political climate in your country?",
    "What political system do you think works best and why?",
  ],
  technology: [
    "Do you think AI will ultimately benefit or harm humanity?",
    "What technological innovation are you most excited about?",
    "How has technology changed your daily life in the past decade?",
  ],
  // Add more starters for other topics as needed
};

const TopicSelector = ({ selectedTopic, setSelectedTopic }) => {
  const { user } = useContext(UserContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStarters, setShowStarters] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});

  // Track online users for each topic
  useEffect(() => {
    if (!user) return;

    // Create a query for active rooms
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('status', '==', 'waiting')
    );

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const topicCounts = {};
      
      // Initialize counts for all topics
      TOPICS.forEach(topic => {
        topicCounts[topic.id] = 0;
      });

      // Count users in waiting rooms for each topic
      snapshot.docs.forEach(doc => {
        const room = doc.data();
        if (room.topic && topicCounts.hasOwnProperty(room.topic)) {
          topicCounts[room.topic] += 1;
        }
      });

      setOnlineUsers(topicCounts);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredTopics = TOPICS.filter((topic) =>
    topic.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTopicSelect = (topicId) => {
    setSelectedTopic(topicId);
    setShowStarters(true);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Select a Topic</h2>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field"
        />
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filteredTopics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => handleTopicSelect(topic.id)}
            className={`p-3 rounded-lg border text-left transition-colors relative ${
              selectedTopic === topic.id
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
            }`}
          >
            <div className="text-xl mb-1">{topic.icon}</div>
            <div className="font-medium">{topic.name}</div>
            {onlineUsers[topic.id] > 0 && (
              <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium 
                ${selectedTopic === topic.id ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                {onlineUsers[topic.id]} online
              </div>
            )}
          </button>
        ))}
      </div>
      
      {showStarters && selectedTopic && CONVERSATION_STARTERS[selectedTopic] && (
        <div className="mt-4 p-4 bg-secondary rounded-lg">
          <h3 className="font-semibold mb-2">Conversation Starters:</h3>
          <ul className="list-disc pl-5 space-y-1">
            {CONVERSATION_STARTERS[selectedTopic].map((starter, index) => (
              <li key={index}>{starter}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TopicSelector; 