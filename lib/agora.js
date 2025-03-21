import { createClient, createMicrophoneAndCameraTracks } from "agora-rtc-react";

export const config = {
  appId: "0a32d285b01947edb0d2ce3043f11968",
  token: null, // For development, we can use null. In production, you should generate a token
};

export const useClient = createClient({ codec: "vp8", mode: "rtc" });
export const useMicrophoneAndCameraTracks = createMicrophoneAndCameraTracks();

export const channelName = "main"; 