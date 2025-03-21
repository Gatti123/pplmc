import { useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { UserContext } from '../context/UserContext';
import UserProfile from '../components/profile/UserProfile';

const ProfilePage = () => {
  const { user } = useContext(UserContext);
  const router = useRouter();

  useEffect(() => {
    // If user is not authenticated, redirect to auth page
    if (!user) {
      router.push('/auth');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-white to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8B5CF6]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-purple-50 pt-20">
      <UserProfile />
    </div>
  );
};

export default ProfilePage; 