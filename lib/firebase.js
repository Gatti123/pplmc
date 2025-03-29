import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Функция для обновления статуса пользователя
const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};

// Функция для входа через Google
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Проверяем, существует ли пользователь в Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Создаем нового пользователя
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        isOnline: true
      });
    } else {
      // Обновляем статус существующего пользователя
      await updateUserOnlineStatus(user.uid, true);
    }
    
    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Функция для обработки результата редиректа
const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const user = result.user;
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
          isOnline: true
        });
      } else {
        await updateUserOnlineStatus(user.uid, true);
      }
      
      return user;
    }
    return null;
  } catch (error) {
    console.error('Error handling redirect result:', error);
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