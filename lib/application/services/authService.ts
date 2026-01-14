/**
 * Authentication Service
 * Encapsulates authentication logic
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface AuthResult {
  userId: string;
  email?: string;
}

/**
 * 認証サービス
 */
export class AuthService {
  /**
   * Firebase Admin SDKを初期化（まだ初期化されていない場合）
   */
  private initializeFirebaseAdmin() {
    if (getApps().length > 0) return;

    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'chumo-3506a';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      initializeApp({
        projectId,
      });
    }
  }

  /**
   * Authorizationヘッダーからトークンを抽出
   */
  extractToken(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split('Bearer ')[1];
  }

  /**
   * IDトークンを検証してユーザー情報を返す
   */
  async verifyToken(token: string): Promise<AuthResult> {
    this.initializeFirebaseAdmin();

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return {
      userId: decodedToken.uid,
      email: decodedToken.email,
    };
  }
}
