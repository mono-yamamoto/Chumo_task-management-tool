import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Label } from '@/types';

/**
 * 全プロジェクト共通の区分ラベルを取得する
 * 区分ラベルは projectId が null のラベルとして管理される
 */
export async function fetchKubunLabels(): Promise<Label[]> {
  if (!db) return [];

  const labelsRef = collection(db, 'labels');
  const q = query(labelsRef, where('projectId', '==', null));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
    createdAt: docItem.data().createdAt?.toDate(),
    updatedAt: docItem.data().updatedAt?.toDate(),
  })) as Label[];
}
