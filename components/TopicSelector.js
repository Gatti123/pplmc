const topics = [
  { id: 'politics', name: 'Politics & Society' },
  { id: 'technology', name: 'Technology & Innovation' },
  { id: 'science', name: 'Science & Research' },
  { id: 'philosophy', name: 'Philosophy & Ethics' },
  { id: 'culture', name: 'Culture & Arts' },
  { id: 'education', name: 'Education & Learning' },
  { id: 'environment', name: 'Environment & Climate' },
  { id: 'health', name: 'Health & Wellness' },
  { id: 'business', name: 'Business & Economy' },
  { id: 'sports', name: 'Sports & Recreation' }
];

const TopicSelector = ({ onSelect }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Choose a Topic for Discussion
        </h2>
        <p className="text-gray-600">
          Select a topic that interests you and start a meaningful conversation
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelect(topic.name)}
            className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 text-left border border-gray-200 hover:border-indigo-500"
          >
            <h3 className="text-lg font-medium text-gray-900">{topic.name}</h3>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopicSelector; 