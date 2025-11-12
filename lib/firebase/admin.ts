import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App | undefined;
let adminDb: Firestore | undefined;

// サーバーサイド用のFirebase Admin初期化
if (typeof window === "undefined") {
  try {
    // 既に初期化されている場合はそれを使用
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "chumo-3506a";
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

      // 環境変数が設定されている場合は明示的に認証情報を指定
      if (clientEmail && privateKey) {
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        // 環境変数が設定されていない場合はデフォルトの認証情報を使用
        // （ローカル環境では通常使用できないが、エラーメッセージを改善するため）
        console.warn("FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are not set. Trying default credentials...");
        app = initializeApp({
          projectId,
        });
      }
    } else {
      app = getApps()[0];
    }
    
    if (app) {
      adminDb = getFirestore(app);
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

export { adminDb };

