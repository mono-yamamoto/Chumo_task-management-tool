import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { User } from '../types';

interface UsersResponse {
  users: User[];
}

/**
 * ユーザー一覧を取得
 * GET /api/users
 */
export function useUsers() {
  const { getToken, isSignedIn } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => apiClient<UsersResponse>('/api/users', { getToken }).then((res) => res.users),
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5, // 5分
  });

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    if (query.data) {
      for (const user of query.data) {
        map.set(user.id, user);
      }
    }
    return map;
  }, [query.data]);

  const getUserById = (userId: string): User | undefined => userMap.get(userId);

  const getUserName = (userId: string): string => userMap.get(userId)?.displayName ?? userId;

  return { ...query, userMap, getUserById, getUserName };
}
