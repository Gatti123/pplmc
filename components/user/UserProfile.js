import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/contexts';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { setProfile, updatePreferences, setError } from '@/store/slices/userSlice';
import { FaUser, FaCog, FaBell, FaGlobe, FaMoon, FaSun } from 'react-icons/fa';

const UserProfile = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { profile, preferences, loading, error } = useSelector((state) => state.user);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          dispatch(setProfile(userDoc.data()));
          setDisplayName(userDoc.data().displayName || user.displayName);
          setBio(userDoc.data().bio || '');
        } else {
          // Create initial profile
          const initialProfile = {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            bio: '',
            createdAt: new Date(),
            lastSeen: new Date()
          };
          await updateDoc(doc(db, 'users', user.uid), initialProfile);
          dispatch(setProfile(initialProfile));
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        dispatch(setError('Failed to load profile'));
      }
    };

    loadProfile();
  }, [user, dispatch]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        bio,
        updatedAt: new Date()
      });
      dispatch(setProfile({ ...profile, displayName, bio }));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      dispatch(setError('Failed to update profile'));
    }
  };

  const handlePreferenceChange = (key, value) => {
    dispatch(updatePreferences({ [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Profile Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <FaUser className="w-12 h-12 text-gray-400" />
            )}
          </div>
          <button className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors">
            <FaCog className="w-4 h-4" />
          </button>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="border rounded px-2 py-1"
              />
            ) : (
              profile?.displayName
            )}
          </h2>
          <p className="text-gray-600">{profile?.email}</p>
        </div>
      </div>

      {/* Bio */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
        {isEditing ? (
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full border rounded p-2"
            rows="4"
            placeholder="Tell us about yourself..."
          />
        ) : (
          <p className="text-gray-600">{bio || 'No bio yet'}</p>
        )}
      </div>

      {/* Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
        
        {/* Language */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaGlobe className="text-gray-500" />
            <span>Language</span>
          </div>
          <select
            value={preferences.language}
            onChange={(e) => handlePreferenceChange('language', e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="ru">Russian</option>
          </select>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {preferences.theme === 'dark' ? (
              <FaMoon className="text-gray-500" />
            ) : (
              <FaSun className="text-gray-500" />
            )}
            <span>Theme</span>
          </div>
          <button
            onClick={() => handlePreferenceChange('theme', preferences.theme === 'light' ? 'dark' : 'light')}
            className="border rounded px-2 py-1"
          >
            {preferences.theme === 'light' ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaBell className="text-gray-500" />
            <span>Notifications</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.notifications}
              onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end space-x-4">
        {isEditing ? (
          <>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Save Changes
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 