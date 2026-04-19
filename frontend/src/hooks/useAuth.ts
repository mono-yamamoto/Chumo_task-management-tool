import { useCallback } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { usePreviewMode } from './usePreviewMode';

export interface UseAuthResult {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  user: ReturnType<typeof useClerkUser>['user'];
  getToken: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const PREVIEW_GET_TOKEN = async () => null;

/**
 * Clerk 認証をラップしたフック
 * getToken / userId / isSignedIn / logout を提供
 */
export function useAuth(): UseAuthResult {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useClerkAuth();
  const { user } = useClerkUser();
  const navigate = useNavigate();
  const { isPreview, logoutPreview } = usePreviewMode();

  const clerkGetToken = useCallback(() => getToken(), [getToken]);

  const logout = useCallback(async () => {
    if (isPreview) {
      logoutPreview();
      return;
    }
    await signOut();
    navigate('/login');
  }, [isPreview, logoutPreview, signOut, navigate]);

  if (isPreview) {
    return {
      isLoaded: true,
      isSignedIn: true,
      userId: 'preview-user',
      user: null,
      getToken: PREVIEW_GET_TOKEN,
      logout,
    };
  }

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId: userId ?? null,
    user,
    getToken: clerkGetToken,
    logout,
  };
}
