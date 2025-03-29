import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  room: null,
  isInRoom: false,
  isFinding: false,
  connectionState: 'disconnected',
  connectionQuality: 'unknown',
  connectionMetrics: {
    rtt: 0,
    bandwidth: 0,
    packetLoss: 0
  },
  localStream: null,
  remoteStream: null,
  audioEnabled: true,
  videoEnabled: true,
  selectedDevices: null,
  showDeviceCheck: true,
  selectedTopic: '',
  filters: {
    language: 'en',
    continent: 'any'
  },
  role: 'participant',
  error: null
};

const videoChatSlice = createSlice({
  name: 'videoChat',
  initialState,
  reducers: {
    setRoom: (state, action) => {
      state.room = action.payload;
      state.isInRoom = !!action.payload;
    },
    setFinding: (state, action) => {
      state.isFinding = action.payload;
    },
    setConnectionState: (state, action) => {
      state.connectionState = action.payload;
    },
    setConnectionQuality: (state, action) => {
      state.connectionQuality = action.payload.quality;
      state.connectionMetrics = action.payload.metrics;
    },
    setLocalStream: (state, action) => {
      state.localStream = action.payload;
    },
    setRemoteStream: (state, action) => {
      state.remoteStream = action.payload;
    },
    toggleAudio: (state) => {
      state.audioEnabled = !state.audioEnabled;
    },
    toggleVideo: (state) => {
      state.videoEnabled = !state.videoEnabled;
    },
    setSelectedDevices: (state, action) => {
      state.selectedDevices = action.payload;
      state.showDeviceCheck = false;
    },
    setSelectedTopic: (state, action) => {
      state.selectedTopic = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      };
    },
    setRole: (state, action) => {
      state.role = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    resetVideoChat: (state) => {
      return initialState;
    }
  }
});

export const {
  setRoom,
  setFinding,
  setConnectionState,
  setConnectionQuality,
  setLocalStream,
  setRemoteStream,
  toggleAudio,
  toggleVideo,
  setSelectedDevices,
  setSelectedTopic,
  setFilters,
  setRole,
  setError,
  resetVideoChat
} = videoChatSlice.actions;

export default videoChatSlice.reducer; 