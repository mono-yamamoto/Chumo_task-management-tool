import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

/**
 * 認証結果
 */
export interface AuthResult {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

/**
 * 認証サービス
 * Firebase Admin SDKを使用したトークン検証を提供
 */
export class AuthService {
  /**
   * Firebase Admin SDKを初期化
   */
  private ensureFirebaseInitialized(): void {
    if (getApps().length === 0) {
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
   * Firebase IDトークンを検証
   */
  async verifyToken(token: string | null): Promise<AuthResult> {
    if (!token) {
      return {
        success: false,
        error: '認証トークンが提供されていません',
      };
    }

    try {
      this.ensureFirebaseInitialized();
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(token);

      return {
        success: true,
        userId: decodedToken.uid,
        email: decodedToken.email,
      };
    } catch (error) {
      console.error('トークン検証エラー:', error);
      return {
        success: false,
        error: 'トークンの検証に失敗しました',
      };
    }
  }
}
