import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Contact } from '@/types';
import { mapContactDoc } from '@/lib/firestore/mappers/contactMapper';

export async function fetchContactsByStatus(
  status: 'pending' | 'resolved'
): Promise<Contact[]> {
  if (!db) return [];

  const contactsRef = collection(db, 'contacts');
  const orderField = status === 'pending' ? 'createdAt' : 'updatedAt';
  const q = query(contactsRef, orderBy(orderField, 'desc'));
  const snapshot = await getDocs(q);
  const allContacts = snapshot.docs.map((docItem) => mapContactDoc(docItem.id, docItem.data()));

  return allContacts.filter((contact) => contact.status === status);
}
