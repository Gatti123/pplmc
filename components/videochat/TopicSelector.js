import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts';

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

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

const CONTINENTS = [
  { code: 'any', name: 'Any Region' },
  { code: 'na', name: 'North America' },
  { code: 'sa', name: 'South America' },
  { code: 'eu', name: 'Europe' },
  { code: 'as', name: 'Asia' },
  { code: 'af', name: 'Africa' },
  { code: 'oc', name: 'Oceania' },
];

const ROLES = [
  { id: 'participant', name: 'Participant' },
  { id: 'observer', name: 'Observer' },
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

const TopicSelector = ({ 
  selectedTopic, 
  onTopicSelect, 
  filters, 
  setFilters, 
  role, 
  setRole, 
  onFindPartner,
  isFinding 
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showStarters, setShowStarters] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});

  // Track online users for each topic
  useEffect(() => {
    if (!user) return;

    // Create a query for active rooms
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('status', 'in', ['waiting', 'active']), // Include both waiting and active rooms
      where('language', '==', filters.language)
    );

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      const topicCounts = {};
      
      // Initialize counts for all topics
      TOPICS.forEach(topic => {
        topicCounts[topic.id] = 0;
      });

      // Count all users in rooms for each topic
      snapshot.docs.forEach(doc => {
        const room = doc.data();
        if (room.topic && topicCounts.hasOwnProperty(room.topic)) {
          // Only count rooms that match the current filters
          if (filters.continent === 'any' || room.continent === filters.continent) {
            // Add count of all participants in the room
            topicCounts[room.topic] += room.participants?.length || 0;
          }
        }
      });

      setOnlineUsers(topicCounts);
    });

    return () => unsubscribe();
  }, [user, filters.language, filters.continent]);

  const filteredTopics = TOPICS.filter((topic) =>
    topic.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTopicSelect = (topicId) => {
    onTopicSelect(topicId);
    setShowStarters(true);
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Select a Topic</h2>
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field w-full"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Language Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Language
          </label>
          <select
            value={filters.language}
            onChange={(e) => setFilters({ ...filters, language: e.target.value })}
            className="input-field w-full"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Continent Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Region
          </label>
          <select
            value={filters.continent}
            onChange={(e) => setFilters({ ...filters, continent: e.target.value })}
            className="input-field w-full"
          >
            {CONTINENTS.map((continent) => (
              <option key={continent.code} value={continent.code}>
                {continent.name}
              </option>
            ))}
          </select>
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input-field w-full"
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
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

      <div className="flex justify-center">
        <button
          onClick={onFindPartner}
          disabled={!selectedTopic || isFinding}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            !selectedTopic || isFinding
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          {isFinding ? 'Finding Partner...' : 'Find Discussion Partner'}
        </button>
      </div>
    </div>
  );
};

export default TopicSelector; 