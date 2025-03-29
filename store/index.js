import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import videoChatReducer from './slices/videoChatSlice';
import chatReducer from './slices/chatSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    videoChat: videoChatReducer,
    chat: chatReducer,
    user: userReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['videoChat/setLocalStream', 'videoChat/setRemoteStream']
      }
    })
}); 