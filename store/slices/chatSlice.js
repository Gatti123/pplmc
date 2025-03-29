import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [],
  loading: false,
  error: null,
  lastMessageId: null
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
      state.lastMessageId = action.payload[action.payload.length - 1]?.id || null;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
      state.lastMessageId = action.payload.id;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.lastMessageId = null;
      state.error = null;
    }
  }
});

export const { setMessages, addMessage, setLoading, setError, clearChat } = chatSlice.actions;
export default chatSlice.reducer; 