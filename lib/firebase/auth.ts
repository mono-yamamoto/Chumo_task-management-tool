import { User } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function checkUserAllowed(userId: string): Promise<boolean> {
  try {
    if (!db) {
      console.error('Firestore is not initialized');
      return false;
    }
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return false;
    }
    const userData = userDoc.data() as Omit<User, 'id'>;
    return userData.isAllowed === true;
  } catch (error) {
    console.error('Error checking user allowed:', error);
    return false;
  }
}

export async function getUser(userId: string): Promise<User | null> {
  try {
    if (!db) {
      console.error('Firestore is not initialized');
      return null;
    }
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }
    const userData = userDoc.data();
    return {
      id: userDoc.id,
      ...userData,
      // Firestore TimestampをDateに変換
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      googleOAuthUpdatedAt: userData.googleOAuthUpdatedAt?.toDate() || undefined,
    } as User;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}
