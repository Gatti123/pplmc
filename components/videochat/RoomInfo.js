import { FaUsers, FaClock, FaTimes } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { resetVideoChat } from '@/store/slices/videoChatSlice';

const RoomInfo = () => {
  const dispatch = useDispatch();
  const { room, user } = useSelector((state) => ({
    room: state.videoChat.room,
    user: state.auth.user
  }));

  const handleLeaveRoom = async () => {
    dispatch(resetVideoChat());
  };

  if (!room) return null;

  return (
    <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* Topic */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {room.topic}
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <FaUsers className="text-indigo-500" />
            <span>{room.participants?.length || 1} participants</span>
            <span>•</span>
            <FaClock className="text-indigo-500" />
            <span>{new Date(room.createdAt?.toDate()).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          {room.filters.language && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
              {room.filters.language.toUpperCase()}
            </span>
          )}
          {room.filters.continent && room.filters.continent !== 'any' && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
              {room.filters.continent.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Leave Button */}
      <button
        onClick={handleLeaveRoom}
        className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        <FaTimes />
        <span>Leave Room</span>
      </button>
    </div>
  );
};

export default RoomInfo; 