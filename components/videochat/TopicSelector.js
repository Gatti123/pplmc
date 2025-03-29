import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts';
import { FaSearch } from 'react-icons/fa';

const TOPICS = [
  { id: 'politics', name: 'Politics and Current Events' },
  { id: 'philosophy', name: 'Philosophy and Ethics' },
  { id: 'science', name: 'Science and Technology' },
  { id: 'culture', name: 'Arts and Culture' },
  { id: 'society', name: 'Society and Social Issues' },
  { id: 'education', name: 'Education and Learning' },
  { id: 'health', name: 'Health and Wellness' },
  { id: 'environment', name: 'Environment and Climate' },
  { id: 'business', name: 'Business and Economics' },
  { id: 'sports', name: 'Sports and Recreation' }
];

const ROLES = [
  { id: 'participant', name: 'Participant' },
  { id: 'observer', name: 'Observer' }
];

const TopicSelector = ({ 
  selectedTopic,
  onTopicSelect,
  selectedRole,
  onRoleSelect,
  filters,
  onFilterChange
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showStarters, setShowStarters] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});

  // Track online users for each topic
  useEffect(() => {
    if (!user) return;

    console.log('Starting room listener for user:', user.uid);

    const roomsQuery = query(
      collection(db, 'rooms'),
      where('status', 'in', ['waiting', 'active'])
    );

    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      console.log('Received snapshot with', snapshot.docs.length, 'rooms');
      
      const topicCounts = {};
      
      // Initialize counts for all topics
      TOPICS.forEach(topic => {
        topicCounts[topic.id] = 0;
      });

      // Count users in rooms
      snapshot.docs.forEach(doc => {
        const room = doc.data();
        console.log('Processing room:', {
          id: doc.id,
          topic: room.topic,
          status: room.status,
          createdBy: room.createdBy,
          participants: room.participants?.length || 0
        });
        
        // Skip own rooms
        if (room.createdBy === user.uid) {
          console.log('Skipping own room');
          return;
        }
        
        // Count participants in each room
        if (room.topic && topicCounts.hasOwnProperty(room.topic)) {
          if (room.participants) {
            console.log(`Adding ${room.participants.length} participants for topic:`, room.topic);
            topicCounts[room.topic] += room.participants.length;
          }
        }
      });

      console.log('Final topic counts:', topicCounts);
      setOnlineUsers(topicCounts);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredTopics = TOPICS.filter((topic) =>
    topic.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTopicSelect = (topicId) => {
    onTopicSelect(topicId);
    setShowStarters(true);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Language Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={filters.language}
            onChange={(e) => onFilterChange({ language: e.target.value })}
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
            onChange={(e) => onFilterChange({ continent: e.target.value })}
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
            value={selectedRole}
            onChange={(e) => onRoleSelect(e.target.value)}
            className="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTopics.map((topic) => (
          <div
            key={topic.id}
            className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer
              ${selectedTopic === topic.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
              }`}
            onClick={() => handleTopicSelect(topic.id)}
          >
            <h3 className="font-medium text-gray-900">{topic.name}</h3>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              {onlineUsers[topic.id] || 0} online
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopicSelector; 