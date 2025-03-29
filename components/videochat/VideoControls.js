import React from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';

const VideoControls = ({
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo
}) => {
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
      <button
        onClick={onToggleAudio}
        className={`p-3 rounded-full ${
          audioEnabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
        } hover:bg-opacity-90 transition-colors`}
        aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {audioEnabled ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
      </button>
      
      <button
        onClick={onToggleVideo}
        className={`p-3 rounded-full ${
          videoEnabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
        } hover:bg-opacity-90 transition-colors`}
        aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {videoEnabled ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
      </button>
    </div>
  );
};

export default VideoControls; 