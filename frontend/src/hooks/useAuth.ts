import { useCallback } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

/**
 * Clerk 認証をラップしたフック
 * getToken / userId / isSignedIn / logout を提供
 */
export function useAuth() {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useClerkAuth();
  const { user } = useClerkUser();
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    await signOut();
    navigate('/login');
  }, [signOut, navigate]);

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId: userId ?? null,
    user,
    getToken: useCallback(() => getToken(), [getToken]),
    logout,
  };
}
