import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, Storage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 環境変数の検証
if (typeof window !== 'undefined') {
  const missingVars = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('Missing Firebase environment variables:', missingVars);
  }
}

let appVar: FirebaseApp | undefined;
let authVar: Auth | undefined;
let dbVar: Firestore | undefined;
let storageVar: Storage | undefined;

if (typeof window !== 'undefined') {
  try {
    appVar = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    authVar = getAuth(appVar);
    dbVar = getFirestore(appVar);
    storageVar = getStorage(appVar);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export const app = appVar;
export const auth = authVar;
export const db = dbVar;
export const storage = storageVar;
