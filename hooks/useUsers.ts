'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User } from '@/types';

/**
 * すべてのユーザーを取得するカスタムフック
 */
export function useUsers() {
  return useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!db) return [];
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as User[];
    },
    enabled: !!db,
  });
}

