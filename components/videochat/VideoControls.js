import React from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';

const VideoControls = ({ audioEnabled, videoEnabled, toggleAudio, toggleVideo }) => {
  return (
    <div className="flex items-center justify-center space-x-3 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
      <button
        onClick={toggleAudio}
        className={`w-10 h-10 flex items-center justify-center rounded-full ${
          audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'
        } transition-colors`}
        title={audioEnabled ? 'Mute' : 'Unmute'}
      >
        {audioEnabled ? <FaMicrophone className="text-white" /> : <FaMicrophoneSlash className="text-white" />}
      </button>
      
      <button
        onClick={toggleVideo}
        className={`w-10 h-10 flex items-center justify-center rounded-full ${
          videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'
        } transition-colors`}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {videoEnabled ? <FaVideo className="text-white" /> : <FaVideoSlash className="text-white" />}
      </button>
    </div>
  );
};

export default VideoControls; 