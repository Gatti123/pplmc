let AgoraRTC = null;

export const config = {
  appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || "0a32d285b01947edb0d2ce3043f11968",
};

// Get token from server
export const getAgoraToken = async (channelName, uid) => {
  try {
    const response = await fetch('/api/agora-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelName,
        uid,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get token');
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error getting Agora token:', error);
    throw error;
  }
};

// Create Agora client
export const createClient = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    if (!AgoraRTC) {
      AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
    }
    
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
    if (!AgoraRTC) {
      AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
    }

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