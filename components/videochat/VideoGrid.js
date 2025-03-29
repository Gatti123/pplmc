import React from 'react';
import VideoControls from './VideoControls';
import ConnectionStatus from './ConnectionStatus';

const VideoGrid = ({
  localStream,
  remoteStream,
  audioEnabled,
  videoEnabled,
  connectionState,
  connectionQuality,
  onToggleAudio,
  onToggleVideo
}) => {
  return (
    <div className="relative flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {/* Local Video */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={(el) => {
            if (el && localStream) {
              el.srcObject = localStream;
            }
          }}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-white text-sm">
          You
        </div>
      </div>

      {/* Remote Video */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={(el) => {
            if (el && remoteStream) {
              el.srcObject = remoteStream;
            }
          }}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-white text-sm">
          Partner
        </div>
      </div>

      {/* Connection Status */}
      <ConnectionStatus
        connectionState={connectionState}
        connectionQuality={connectionQuality}
      />

      {/* Video Controls */}
      <VideoControls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
      />
    </div>
  );
};

export default VideoGrid; 