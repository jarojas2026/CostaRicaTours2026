import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC8vwxbWU_DGutO3cqTat_iScoxfkNqCPE",
  authDomain: "original-iterator-4bndl.firebaseapp.com",
  projectId: "original-iterator-4bndl",
  storageBucket: "original-iterator-4bndl.firebasestorage.app",
  messagingSenderId: "977549090045",
  appId: "1:977549090045:web:61d7433df5c97df8cf3294"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-puravidacostaric-88d81273-09f7-4f87-991c-60b9b0db0dea");
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
