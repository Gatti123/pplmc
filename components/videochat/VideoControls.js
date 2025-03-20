import { useState } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaFlag } from 'react-icons/fa';
import { toast } from 'react-toastify';

const VideoControls = ({ room, onLeave }) => {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const toggleAudio = () => {
    if (room) {
      room.localParticipant.audioTracks.forEach((publication) => {
        if (isAudioMuted) {
          publication.track.enable();
        } else {
          publication.track.disable();
        }
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (room) {
      room.localParticipant.videoTracks.forEach((publication) => {
        if (isVideoOff) {
          publication.track.enable();
        } else {
          publication.track.disable();
        }
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleLeave = () => {
    if (onLeave) {
      onLeave();
    }
  };

  const handleReport = () => {
    setIsReportModalOpen(true);
  };

  const submitReport = () => {
    // In a real app, this would send the report to the server
    toast.success('Report submitted. Thank you for helping keep our platform safe.');
    setIsReportModalOpen(false);
    setReportReason('');
  };

  return (
    <div className="mt-4">
      <div className="flex justify-center space-x-4">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full ${
            isAudioMuted ? 'bg-red-500' : 'bg-primary'
          } text-white`}
          title={isAudioMuted ? 'Unmute' : 'Mute'}
        >
          {isAudioMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${
            isVideoOff ? 'bg-red-500' : 'bg-primary'
          } text-white`}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
        </button>

        <button
          onClick={handleLeave}
          className="p-3 rounded-full bg-red-500 text-white"
          title="Leave discussion"
        >
          <FaPhoneSlash />
        </button>

        <button
          onClick={handleReport}
          className="p-3 rounded-full bg-yellow-500 text-white"
          title="Report user"
        >
          <FaFlag />
        </button>
      </div>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-primary mb-4">Report User</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for report
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="input-field"
              >
                <option value="">Select a reason</option>
                <option value="inappropriate_behavior">Inappropriate behavior</option>
                <option value="hate_speech">Hate speech</option>
                <option value="harassment">Harassment</option>
                <option value="spam">Spam</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional details (optional)
              </label>
              <textarea
                className="input-field"
                rows="3"
                placeholder="Please provide any additional details about the issue"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason}
                className={`px-4 py-2 rounded text-white ${
                  reportReason ? 'bg-primary hover:bg-primary-dark' : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoControls; 