import React, { useState } from "react";
import { useAuth } from "@/contexts";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const Home = () => {
  const { user, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const user = await signInWithGoogle();
      
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date().toISOString(),
            preferences: {
              language: navigator.language || 'en',
              continent: 'any',
            }
          });
        }
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {user ? `Welcome, ${user.displayName}` : 'Welcome to Polemica'}
          </h1>
          <p className="mt-2 text-gray-600">
            {user ? 'Start meaningful discussions' : 'Sign in to get started'}
          </p>
        </div>
        
        {!user && (
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Home;
