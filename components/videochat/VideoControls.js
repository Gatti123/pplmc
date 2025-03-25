import React, { useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';

const VideoControls = ({
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onLeave,
  remoteUserId
}) => {
  const [showFeedback, setShowFeedback] = useState(false);

  const handleReport = async () => {
    if (confirm('Are you sure you want to report this user for inappropriate behavior?')) {
      // Here you would implement the actual report functionality
      toast.success('Report submitted. Thank you for helping keep our community safe.');
    }
  };

  const handleFeedback = async (rating) => {
    // Here you would implement the actual feedback submission
    toast.success('Thank you for your feedback!');
    setShowFeedback(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleVideo}
            className={`p-3 rounded-full ${
              isVideoEnabled ? 'bg-gray-200' : 'bg-red-500 text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d={isVideoEnabled ? 
                  "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" :
                  "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"}
              />
            </svg>
          </button>

          <button
            onClick={onToggleAudio}
            className={`p-3 rounded-full ${
              isAudioEnabled ? 'bg-gray-200' : 'bg-red-500 text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={isAudioEnabled ?
                  "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" :
                  "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"}
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleReport}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700"
          >
            Report User
          </button>

          {!showFeedback ? (
            <button
              onClick={() => setShowFeedback(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Rate Partner
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleFeedback(rating)}
                  className="text-2xl hover:text-yellow-500"
                >
                  ⭐
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onLeave}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoControls; 