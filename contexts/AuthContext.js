import { createContext, useContext, useState, useEffect } from 'react';
import { auth, handleRedirectResult } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithRedirect,
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onIdTokenChanged
} from 'firebase/auth';
import { toast } from 'react-toastify';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for token changes (session expiration)
    const unsubscribeToken = onIdTokenChanged(auth, (user) => {
      if (user) {
        // Token is valid
        user.getIdToken(true).catch((error) => {
          console.error('Error refreshing token:', error);
          if (error.code === 'auth/id-token-expired') {
            toast.error('Your session has expired. Please sign in again.');
            logout();
          }
        });
      }
    });

    // Check if the user has been redirected from auth provider
    handleRedirectResult()
      .then((result) => {
        if (result) {
          console.log("Handled redirect auth result in context");
        }
      })
      .catch((error) => {
        console.error("Error handling redirect in context:", error);
        toast.error('Authentication failed. Please try again.');
      });

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      
      // Check if device is mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Use redirect for mobile
        console.log("Using redirect for mobile auth");
        await signInWithRedirect(auth, provider);
        return null; // The result will be handled in useEffect
      } else {
        // Use popup for desktop
        console.log("Using popup for desktop auth");
        const result = await signInWithPopup(auth, provider);
        return result.user;
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.info('Sign in was cancelled');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Please allow popups for this site');
      } else {
        toast.error('Failed to sign in with Google');
      }
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error('Error signing in with email:', error);
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect password');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later');
      } else {
        toast.error('Failed to sign in');
      }
      throw error;
    }
  };

  const signUpWithEmail = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      return result.user;
    } catch (error) {
      console.error('Error signing up with email:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters');
      } else {
        toast.error('Failed to create account');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      toast.success('Successfully signed out');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 