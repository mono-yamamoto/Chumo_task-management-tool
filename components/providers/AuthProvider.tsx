'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/http/apiClient';
import { User } from '@/types';

interface AuthContextValue {
  firebaseUser: ReturnType<typeof useClerkUser>['user'] | null;
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  isSignedIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  const value: AuthContextValue = {
    firebaseUser: clerkUser ?? null,
    user,
    loading: !isLoaded || loading,
    login,
    logout,
    getToken: () => getToken(),
    isSignedIn: isSignedIn ?? false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
