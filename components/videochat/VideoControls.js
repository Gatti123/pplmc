import React from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';

const VideoControls = ({
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onLeave,
}) => {
  return (
    <div className="flex justify-center items-center gap-4 p-4 bg-gray-800">
      {/* Audio toggle button */}
      <button
        onClick={onToggleAudio}
        className={`p-4 rounded-full transition-all duration-200 ${
          isAudioEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'
        }`}
        title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
      >
        {isAudioEnabled ? (
          <FaMicrophone className="w-6 h-6 text-white" />
        ) : (
          <FaMicrophoneSlash className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Video toggle button */}
      <button
        onClick={onToggleVideo}
        className={`p-4 rounded-full transition-all duration-200 ${
          isVideoEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'
        }`}
        title={isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
      >
        {isVideoEnabled ? (
          <FaVideo className="w-6 h-6 text-white" />
        ) : (
          <FaVideoSlash className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Leave call button */}
      <button
        onClick={onLeave}
        className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-200"
        title="Leave Call"
      >
        <FaPhoneSlash className="w-6 h-6 text-white" />
      </button>
    </div>
  );
};

export default VideoControls; 