'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Label } from '@/types';

/**
 * 全プロジェクト共通の区分ラベルを取得するカスタムフック
 * 区分ラベルは projectId が null のラベルとして管理される
 */
export function useKubunLabels() {
  return useQuery({
    queryKey: ['kubunLabels'],
    queryFn: async () => {
      if (!db) return [];
      const labelsRef = collection(db, 'labels');
      const q = query(labelsRef, where('projectId', '==', null));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Label[];
    },
    enabled: !!db,
  });
}
