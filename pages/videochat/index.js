import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts';
import VideoChat from '@/components/videochat/VideoChat';
import Head from 'next/head';

const VideoChatPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin?redirect=/videochat');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <>
      <Head>
        <title>Video Chat | Polemica</title>
        <meta name="description" content="Engage in thought-provoking video discussions on Polemica" />
      </Head>
      <VideoChat />
    </>
  );
};

export default VideoChatPage; 