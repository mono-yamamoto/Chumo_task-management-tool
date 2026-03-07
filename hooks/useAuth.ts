'use client';

import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/http/apiClient';
import { User } from '@/types';

export function useAuth() {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Clerk 認証状態が変わったら DB のユーザー情報を取得
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setUser(null);
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const userData = await apiClient<{ user: User }>('/api/users/me', {
          getToken: () => getToken(),
        });
        setUser(userData.user);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [isLoaded, isSignedIn, getToken]);

  const login = useCallback(async () => {
    // Clerk では ClerkProvider + middleware が認証を管理するため、
    // ログインは /sign-in ページへのリダイレクトで行う
    router.push('/sign-in');
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, [signOut, router]);

  return {
    // 後方互換: firebaseUser の代わりに clerkUser を提供
    firebaseUser: clerkUser ?? null,
    user,
    loading: !isLoaded || loading,
    login,
    logout,
    // 新規: Clerk のトークン取得関数（API クライアントで使う）
    getToken: () => getToken(),
    isSignedIn: isSignedIn ?? false,
  };
}
