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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-20">
      <UserProfile />
    </div>
  );
};

export default ProfilePage; 