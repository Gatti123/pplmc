import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase if it hasn't been initialized yet
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Function to update user's online status
const updateUserOnlineStatus = async (userId, isOnline = true) => {
  if (!userId) return;
  
  try {
    const userStatusRef = doc(db, 'userStatus', userId);
    await setDoc(userStatusRef, {
      online: isOnline,
      lastSeen: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating online status:', error);
  }
};

const signInWithGoogle = async () => {
  try {
    // Check if device is mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Use redirect method for mobile devices
      await signInWithRedirect(auth, googleProvider);
    } else {
      // Use popup for desktop
      await signInWithPopup(auth, googleProvider);
    }
  } catch (error) {
    console.error('Auth error:', error);
    throw error;
  }
};

export { 
  app, 
  auth, 
  db, 
  storage, 
  googleProvider,
  updateUserOnlineStatus,
  signInWithGoogle
}; 