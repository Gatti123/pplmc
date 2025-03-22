import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FaVideo, FaCalendarAlt, FaUsers } from 'react-icons/fa';

const HistoryPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [recentDiscussions, setRecentDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If user is not authenticated, redirect to auth page
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchRecentDiscussions = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRecentDiscussions(userData.recentDiscussions || []);
        }
      } catch (error) {
        console.error('Error fetching recent discussions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentDiscussions();
  }, [user, router]);

  const handleContinueDiscussion = (roomId) => {
    router.push(`/videochat?roomId=${roomId}`);
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Recent Discussions</h1>

        {recentDiscussions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-500 mb-4">
              You haven't participated in any discussions yet.
            </div>
            <button
              onClick={() => router.push('/videochat')}
              className="btn-primary inline-flex items-center"
            >
              <FaVideo className="mr-2" />
              Start a Discussion
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentDiscussions
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((discussion, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-primary p-4 text-white">
                    <h3 className="text-xl font-semibold">{discussion.topic}</h3>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center text-gray-600 mb-3">
                      <FaCalendarAlt className="mr-2" />
                      <span>
                        {new Date(discussion.timestamp).toLocaleDateString()} at{' '}
                        {new Date(discussion.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-4">
                      <FaUsers className="mr-2" />
                      <span>
                        {discussion.participants.length} participant
                        {discussion.participants.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleContinueDiscussion(discussion.roomId)}
                      className="btn-primary w-full"
                    >
                      Continue Discussion
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage; 