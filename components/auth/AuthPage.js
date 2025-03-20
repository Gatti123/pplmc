import { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';

const AuthPage = () => {
  const [isSignIn, setIsSignIn] = useState(true);

  const toggleForm = () => {
    setIsSignIn(!isSignIn);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-primary-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-4xl font-extrabold text-center text-white mb-2">Polemica</h1>
        <p className="text-center text-secondary text-lg mb-8">
          Connect with others through meaningful discussions
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {isSignIn ? (
          <SignIn onToggleForm={toggleForm} />
        ) : (
          <SignUp onToggleForm={toggleForm} />
        )}
      </div>
    </div>
  );
};

export default AuthPage; 