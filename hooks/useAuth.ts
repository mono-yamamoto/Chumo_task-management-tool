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
          // メールアドレスも渡して、メールアドレスで事前登録されているユーザーをマッチング
          const email = firebaseUserParam.email || undefined;
          const isAllowed = await checkUserAllowed(firebaseUserParam.uid, email);
          if (!isAllowed) {
            if (auth) {
              await signOut(auth);
            }
            setUser(null);
            setLoading(false);
            router.push('/login?error=not_allowed');
            return;
          }
          const userData = await getUser(firebaseUserParam.uid, email);
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
      const result = await signInWithPopup(auth, provider);
      // ログイン成功後、すぐに許可チェックを行う
      if (result.user) {
        const email = result.user.email || undefined;
        const isAllowed = await checkUserAllowed(result.user.uid, email);
        if (!isAllowed) {
          // 許可されていない場合はログアウトしてエラーを投げる
          await signOut(auth);
          const notAllowedError = new Error('NOT_ALLOWED');
          (notAllowedError as any).code = 'auth/not-allowed';
          throw notAllowedError;
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      // 許可されていないユーザーのエラーはそのまま投げる
      if (error.code === 'auth/not-allowed' || error.message === 'NOT_ALLOWED') {
        throw error;
      }
      // その他のエラーも投げる
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

