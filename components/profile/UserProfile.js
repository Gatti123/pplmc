import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { FaStar, FaLanguage, FaHistory, FaAward } from 'react-icons/fa';

const UserProfile = () => {
  const { user } = useContext(UserContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedLanguages, setEditedLanguages] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile(userData);
          setEditedLanguages(userData.languages || []);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        languages: editedLanguages,
      });
      setProfile(prev => ({ ...prev, languages: editedLanguages }));
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-white text-primary flex items-center justify-center text-2xl font-bold">
              {profile.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile.displayName || 'Anonymous'}</h1>
              <p className="text-secondary">Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <FaStar className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary">
              {profile.rating || '4.5'}/5.0
            </div>
            <div className="text-gray-600">Average Rating</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <FaHistory className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary">
              {profile.recentDiscussions?.length || 0}
            </div>
            <div className="text-gray-600">Discussions</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <FaAward className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary">
              {profile.level || 1}
            </div>
            <div className="text-gray-600">Level</div>
          </div>
        </div>

        {/* Languages */}
        <div className="p-6 border-t">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FaLanguage className="mr-2" />
              Languages
            </h2>
            <button
              onClick={() => setEditing(!editing)}
              className="text-primary hover:text-primary-dark"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      if (editedLanguages.includes(lang.code)) {
                        setEditedLanguages(prev => prev.filter(l => l !== lang.code));
                      } else {
                        setEditedLanguages(prev => [...prev, lang.code]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      editedLanguages.includes(lang.code)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSaveProfile}
                className="btn-primary w-full"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(profile.languages || []).map(langCode => (
                <span
                  key={langCode}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                >
                  {LANGUAGES.find(l => l.code === langCode)?.name || langCode}
                </span>
              ))}
              {(profile.languages || []).length === 0 && (
                <span className="text-gray-500">No languages specified</span>
              )}
            </div>
          )}
        </div>

        {/* Recent Discussions */}
        <div className="p-6 border-t">
          <h2 className="text-xl font-semibold mb-4">Recent Discussions</h2>
          {profile.recentDiscussions?.length > 0 ? (
            <div className="space-y-4">
              {profile.recentDiscussions.map((discussion, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{discussion.topic}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(discussion.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {discussion.rating && (
                      <div className="flex items-center">
                        <FaStar className="text-yellow-400 mr-1" />
                        <span>{discussion.rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No discussions yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 