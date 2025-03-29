import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  loading: false,
  error: null,
  preferences: {
    language: 'en',
    theme: 'light',
    notifications: true,
    autoJoin: false
  }
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action) => {
      state.profile = action.payload;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    updatePreferences: (state, action) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload
      };
    },
    clearProfile: (state) => {
      state.profile = null;
      state.error = null;
    }
  }
});

export const { setProfile, setLoading, setError, updatePreferences, clearProfile } = userSlice.actions;
export default userSlice.reducer; 