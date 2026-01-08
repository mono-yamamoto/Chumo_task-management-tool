import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Contact } from '@/types';
import { mapContactDoc } from '@/lib/firestore/mappers/contactMapper';

/**
 * 指定されたステータスのお問い合わせを取得する
 * @param status 取得したいお問い合わせのステータス（pending | resolved）
 * @returns ステータスでフィルタリングされたお問い合わせリスト
 */
export async function fetchContactsByStatus(
  status: 'pending' | 'resolved'
): Promise<Contact[]> {
  if (!db) return [];

  const contactsRef = collection(db, 'contacts');
  const orderField = status === 'pending' ? 'createdAt' : 'updatedAt';
  const q = query(contactsRef, where('status', '==', status), orderBy(orderField, 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docItem) => mapContactDoc(docItem.id, docItem.data()));
}
