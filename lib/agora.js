import AgoraRTC from 'agora-rtc-sdk-ng';

export const config = {
  appId: "0a32d285b01947edb0d2ce3043f11968",
  token: null, // For development, we can use null. In production, you should generate a token
};

// Create Agora client
export const createClient = () => {
  if (typeof window === 'undefined') return null;
  return AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
};

// Create tracks
export const createMicrophoneAndCameraTracks = async () => {
  if (typeof window === 'undefined') return { tracks: null, ready: false };
  
  try {
    const tracks = await AgoraRTC.createMicrophoneAndCameraTrack();
    return {
      ready: true,
      tracks: tracks
    };
  } catch (error) {
    console.error("Error creating tracks:", error);
    return {
      ready: false,
      tracks: null
    };
  }
};

export const channelName = "main"; 