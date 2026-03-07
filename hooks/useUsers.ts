'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchAllUsers } from '@/lib/api/userRepository';

/**
 * すべてのユーザーを取得するカスタムフック
 */
export function useUsers() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['allUsers'],
    queryFn: () => fetchAllUsers(getToken),
  });
}
