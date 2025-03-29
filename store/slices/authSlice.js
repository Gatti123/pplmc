import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  loading: true,
  error: null,
  preferences: {
    language: 'en',
    continent: 'any',
    notifications: true
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.user = null;
    },
    updatePreferences: (state, action) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload
      };
    },
    clearAuth: (state) => {
      state.user = null;
      state.error = null;
    }
  }
});

export const {
  setUser,
  setLoading,
  setError,
  updatePreferences,
  clearAuth
} = authSlice.actions;

export default authSlice.reducer; 