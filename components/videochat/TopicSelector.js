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

    // Create a query for waiting rooms only
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
        
        // Skip if room doesn't match current filters
        if (room.language !== filters.language) return;
        if (filters.continent !== 'any' && room.continent !== filters.continent) return;
        
        // Skip own rooms
        if (room.createdBy === user.uid) return;
        
        // Increment count for this topic if it exists
        if (room.topic && topicCounts.hasOwnProperty(room.topic)) {
          topicCounts[room.topic]++;
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Find Discussion Partner</h2>
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field w-full"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredTopics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => handleTopicSelect(topic.id)}
            className={`topic-card ${
              selectedTopic === topic.id
                ? 'topic-card-selected'
                : 'topic-card-default'
            }`}
          >
            <div className="text-2xl mb-2">{topic.icon}</div>
            <div className="font-medium">{topic.name}</div>
            {onlineUsers[topic.id] > 0 && (
              <div className={`online-badge ${
                selectedTopic === topic.id 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'bg-primary bg-opacity-10 text-primary'
              }`}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                {onlineUsers[topic.id]} online
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Filters Section */}
      <div className="filter-section">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Discussion Settings</h3>
        <div className="filter-grid">
          {/* Language Selection */}
          <div className="space-y-2">
            <label className="filter-label">Language</label>
            <select
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
              className="filter-select"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Continent Selection */}
          <div className="space-y-2">
            <label className="filter-label">Region</label>
            <select
              value={filters.continent}
              onChange={(e) => setFilters({ ...filters, continent: e.target.value })}
              className="filter-select"
            >
              {CONTINENTS.map((continent) => (
                <option key={continent.code} value={continent.code}>
                  {continent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="filter-label">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="filter-select"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conversation Starters */}
      {showStarters && selectedTopic && CONVERSATION_STARTERS[selectedTopic] && (
        <div className="bg-secondary rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation Starters</h3>
          <ul className="space-y-3">
            {CONVERSATION_STARTERS[selectedTopic].map((starter, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span className="text-gray-700">{starter}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Find Partner Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onFindPartner}
          disabled={!selectedTopic || isFinding}
          className={`
            px-8 py-4 rounded-lg font-semibold text-lg
            transition-all duration-200 transform
            flex items-center gap-3
            ${!selectedTopic || isFinding
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-dark hover:scale-105'
            }
          `}
        >
          {isFinding ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Finding Partner...</span>
            </>
          ) : (
            'Find Discussion Partner'
          )}
        </button>
      </div>

      {isFinding && (
        <div className="text-center space-y-2 animate-pulse">
          <p className="text-gray-700">
            Looking for someone interested in {TOPICS.find(t => t.id === selectedTopic)?.name}
          </p>
          <p className="text-gray-500 text-sm">This may take a few moments...</p>
        </div>
      )}
    </div>
  );
};

export default TopicSelector; 