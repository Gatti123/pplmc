import AgoraRTC from 'agora-rtc-sdk-ng';

export const config = {
  appId: "0a32d285b01947edb0d2ce3043f11968",
  token: null, // For development, we can use null. In production, you should generate a token
};

// Create Agora client
export const createClient = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    return AgoraRTC.createClient({ 
      mode: "rtc", 
      codec: "vp8",
      role: "host"
    });
  } catch (error) {
    console.error("Error creating Agora client:", error);
    return null;
  }
};

// Create tracks
export const createMicrophoneAndCameraTracks = async () => {
  if (typeof window === 'undefined') {
    return { tracks: null, ready: false };
  }
  
  try {
    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
      {
        encoderConfig: "high_quality",
        stereo: true,
        AEC: true,
        ANS: true,
        AGC: true,
      },
      {
        encoderConfig: {
          width: 640,
          height: 480,
          frameRate: 30,
          bitrateMin: 400,
          bitrateMax: 1000,
        },
        facingMode: "user",
      }
    );

    return {
      ready: true,
      tracks: [audioTrack, videoTrack]
    };
  } catch (error) {
    console.error("Error creating tracks:", error);
    return {
      ready: false,
      tracks: null,
      error: error.message
    };
  }
};

export const channelName = "main"; 