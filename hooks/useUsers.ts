'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAllUsers } from '@/lib/firestore/repositories/userRepository';

/**
 * すべてのユーザーを取得するカスタムフック
 */
export function useUsers() {
  return useQuery({
    queryKey: ['allUsers'],
    queryFn: fetchAllUsers,
  });
}
