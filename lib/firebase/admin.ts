import {
  initializeApp, getApps, cert, App,
} from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let appVar: App | undefined;
let adminDbVar: Firestore | undefined;

// サーバーサイド用のFirebase Admin初期化
if (typeof window === 'undefined') {
  try {
    // 既に初期化されている場合はそれを使用
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'chumo-3506a';
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      // 環境変数が設定されている場合は明示的に認証情報を指定
      if (clientEmail && privateKey) {
        appVar = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        console.info('Firebase Admin initialized with credentials');
      } else {
        // 環境変数が設定されていない場合はエラーを出す
        console.error('FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are not set. Firebase Admin SDK requires these environment variables.');
        console.error('Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local');
        // エラーを出さずに、後でAPIルートで再初期化を試みる
        // app = initializeApp({ projectId }); // コメントアウト
      }
    } else {
      [appVar] = getApps();
      // 既に初期化されている場合でも、認証情報が設定されているか確認
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      if (!clientEmail || !privateKey) {
        console.warn('Firebase Admin app is already initialized, but FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY is not set. This may cause permission errors.');
      }
    }

    if (appVar) {
      adminDbVar = getFirestore(appVar);
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export const adminDb = adminDbVar;
