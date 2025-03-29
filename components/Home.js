import React, { useState } from "react";
import { useAuth } from "@/contexts";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import Navbar from './layout/Navbar';

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Connect through</span>
            <span className="block text-indigo-600">meaningful discussions</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Join Polemica to engage in thoughtful debates and expand your perspective through video discussions.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <a
                href="#"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
              >
                Start a Discussion
              </a>
            </div>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            How It Works
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                1
              </div>
              <h3 className="mt-5 text-lg font-medium text-gray-900">Choose a Topic</h3>
              <p className="mt-2 text-base text-gray-500">
                Select from a variety of discussion topics or create your own.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                2
              </div>
              <h3 className="mt-5 text-lg font-medium text-gray-900">Match with Others</h3>
              <p className="mt-2 text-base text-gray-500">
                Get matched with someone who shares your interest in the topic.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                3
              </div>
              <h3 className="mt-5 text-lg font-medium text-gray-900">Start Discussing</h3>
              <p className="mt-2 text-base text-gray-500">
                Engage in a meaningful video discussion and share perspectives.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
