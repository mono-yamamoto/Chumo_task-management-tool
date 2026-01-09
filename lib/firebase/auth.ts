import { User } from '@/types';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * メールアドレスでユーザードキュメントを検索
 */
async function findUserByEmail(email: string): Promise<{ docId: string; data: any } | null> {
  if (!db) return null;

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docItem = snapshot.docs[0];
  return {
    docId: docItem.id,
    data: docItem.data(),
  };
}

/**
 * メールアドレスで登録されているユーザーをUIDに移動
 */
async function migrateUserToUid(email: string, uid: string): Promise<boolean> {
  if (!db) return false;

  try {
    const found = await findUserByEmail(email);
    if (!found) return false;

    // 既にUIDでドキュメントが存在する場合は何もしない
    const existingUidDoc = await getDoc(doc(db, 'users', uid));
    if (existingUidDoc.exists()) {
      // UIDのドキュメントが既に存在する場合、メールアドレスで見つかったドキュメントを削除
      if (found.docId !== uid) {
        await deleteDoc(doc(db, 'users', found.docId));
      }
      return true;
    }

    // メールアドレスで見つかったドキュメントをUIDに移動
    if (found.docId !== uid) {
      // UIDで新しいドキュメントを作成
      await setDoc(doc(db, 'users', uid), {
        ...found.data,
        updatedAt: new Date(),
      });
      // 古いドキュメントを削除
      await deleteDoc(doc(db, 'users', found.docId));
    }

    return true;
  } catch (error) {
    console.error('Error migrating user to UID:', error);
    return false;
  }
}

export async function checkUserAllowed(userId: string, email?: string): Promise<boolean> {
  try {
    if (!db) {
      console.error('Firestore is not initialized');
      return false;
    }

    // まずUIDで検索
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data() as Omit<User, 'id'>;
      return userData.isAllowed === true;
    }

    // UIDで見つからない場合、メールアドレスで検索（メールアドレスが提供されている場合）
    if (email) {
      const found = await findUserByEmail(email);
      if (found) {
        // メールアドレスで見つかった場合、UIDに移動
        await migrateUserToUid(email, userId);
        // 再度UIDで検索
        const migratedDoc = await getDoc(doc(db, 'users', userId));
        if (migratedDoc.exists()) {
          const userData = migratedDoc.data() as Omit<User, 'id'>;
          return userData.isAllowed === true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking user allowed:', error);
    return false;
  }
}

export async function getUser(userId: string, email?: string): Promise<User | null> {
  try {
    if (!db) {
      console.error('Firestore is not initialized');
      return null;
    }

    // まずUIDで検索
    let userDoc = await getDoc(doc(db, 'users', userId));

    // UIDで見つからない場合、メールアドレスで検索（メールアドレスが提供されている場合）
    if (!userDoc.exists() && email) {
      const found = await findUserByEmail(email);
      if (found) {
        // メールアドレスで見つかった場合、UIDに移動
        await migrateUserToUid(email, userId);
        // 再度UIDで検索
        userDoc = await getDoc(doc(db, 'users', userId));
      }
    }

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
