import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { User } from '../types';

interface CurrentUserResponse {
  user: User;
}

/**
 * 現在ログイン中のユーザー情報を取得
 * GET /api/users/me
 */
export function useCurrentUser() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.currentUser(),
    queryFn: () =>
      apiClient<CurrentUserResponse>('/api/users/me', { getToken }).then((res) => res.user),
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5, // 5分
  });
}
