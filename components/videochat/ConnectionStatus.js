import { FaSignal, FaExclamationTriangle } from 'react-icons/fa';

const ConnectionStatus = ({ connectionState, connectionQuality }) => {
  const getStatusColor = () => {
    switch (connectionQuality) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'disconnected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionQuality) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Checking connection...';
    }
  };

  return (
    <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
      <FaSignal className={`${getStatusColor()}`} />
      <span className="text-white text-sm">{getStatusText()}</span>
      {connectionQuality === 'disconnected' && (
        <FaExclamationTriangle className="text-yellow-500" />
      )}
    </div>
  );
};

export default ConnectionStatus; 