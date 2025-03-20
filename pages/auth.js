import { useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import AuthPage from '../components/auth/AuthPage';
import { UserContext } from '../context/UserContext';

const Auth = () => {
  const { user } = useContext(UserContext);
  const router = useRouter();

  useEffect(() => {
    // If user is already authenticated, redirect to home page
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  return <AuthPage />;
};

export default Auth; 