import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
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
      console.log('Using redirect auth for mobile device');
      await signInWithRedirect(auth, googleProvider);
      
      // Note: This will redirect the user, so code after this point
      // will only execute when the user returns to the app
      
      // To handle the redirect result, use getRedirectResult()
      // This should typically be in a useEffect in a component that loads
      // after authentication
    } else {
      // Use popup for desktop
      console.log('Using popup auth for desktop');
      await signInWithPopup(auth, googleProvider);
    }
  } catch (error) {
    console.error('Auth error:', error);
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      console.log('Authentication was cancelled by the user');
    } else if (error.code === 'auth/popup-blocked') {
      console.log('Authentication popup was blocked. Please allow popups for this site');
      // Could try redirect as fallback
      await signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
};

// Add a function to handle redirect result
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    
    if (result) {
      console.log("Redirect authentication successful:", result.user.displayName);
      return result.user;
    }
    
    return null;
  } catch (error) {
    console.error("Error handling redirect result:", error);
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
  signInWithGoogle,
  handleRedirectResult
}; 