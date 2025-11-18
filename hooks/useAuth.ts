'use client';

import { useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { checkUserAllowed, getUser } from '@/lib/firebase/auth';
import { User } from '@/types';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      console.error('Firebase Auth is not initialized');
      // 次のレンダリングサイクルでsetStateを実行
      setTimeout(() => {
        setLoading(false);
      }, 0);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUserParam) => {
      setFirebaseUser(firebaseUserParam);
      if (firebaseUserParam) {
        try {
          const isAllowed = await checkUserAllowed(firebaseUserParam.uid);
          if (!isAllowed) {
            if (auth) {
              await signOut(auth);
            }
            setUser(null);
            setLoading(false);
            router.push('/login?error=not_allowed');
            return;
          }
          const userData = await getUser(firebaseUserParam.uid);
          setUser(userData);
        } catch (error) {
          console.error('Error in auth state change:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const login = async () => {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
    return undefined;
  };

  const logout = async () => {
    if (!auth) {
      return undefined;
    }
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
    return undefined;
  };

  return {
    firebaseUser,
    user,
    loading,
    login,
    logout,
  };
}

