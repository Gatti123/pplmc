import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts';
import Navbar from '@/components/layout/Navbar';

const AuthPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { redirect } = router.query;

  useEffect(() => {
    if (!loading && user) {
      router.push(redirect || '/');
    }
  }, [user, loading, router, redirect]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Join the discussion and connect with others
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <button
              onClick={() => router.push('/')}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 