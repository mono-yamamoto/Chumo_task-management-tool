import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createHmac } from 'crypto';
import { adminDb } from '@/lib/firebase/admin';

// リダイレクトURIの構築
function getRedirectUri(): string {
  // 優先順位: GOOGLE_OAUTH_REDIRECT_URI > SERVER_URL > NEXT_PUBLIC_FUNCTIONS_URL > localhost
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }

  const baseUrl =
    process.env.SERVER_URL ||
    (process.env.NEXT_PUBLIC_FUNCTIONS_URL
      ? process.env.NEXT_PUBLIC_FUNCTIONS_URL.replace('/functions', '')
      : 'http://localhost:3000');

  return `${baseUrl}/api/auth/google/callback`;
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  getRedirectUri()
);

// stateトークンの検証
function verifyStateToken(stateToken: string): string | null {
  try {
    const secret = process.env.OAUTH_STATE_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
    const decoded = Buffer.from(stateToken, 'base64url').toString('utf-8');
    const [payload, signature] = decoded.split(':');

    if (!payload || !signature) {
      return null;
    }

    // 署名を検証
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
      return null; // 署名が一致しない
    }

    // ペイロードからuserIdを抽出
    const [userId, nonce, timestamp] = payload.split(':');

    // タイムスタンプの有効期限チェック（30分以内）
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    const maxAge = 30 * 60 * 1000; // 30分
    if (tokenAge > maxAge || tokenAge < 0) {
      return null; // トークンが期限切れ
    }

    return userId;
  } catch {
    return null; // パースエラー
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const stateToken = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=oauth_error&message=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !stateToken) {
    return NextResponse.redirect(new URL('/settings?error=missing_params', request.url));
  }

  // stateトークンを検証してuserIdを取得
  const userId = verifyStateToken(stateToken);
  if (!userId) {
    console.error('Invalid or expired state token');
    return NextResponse.redirect(new URL('/settings?error=invalid_state', request.url));
  }

  try {
    // 認証コードをトークンに交換
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL('/settings?error=no_refresh_token', request.url));
    }

    // Firestoreにリフレッシュトークンを保存
    if (!adminDb) {
      throw new Error('Firestore Admin is not initialized');
    }
    console.debug('Saving refresh token for userId:', userId);
    console.debug('Refresh token length:', tokens.refresh_token?.length || 0);

    // ユーザードキュメントが存在するか確認
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.error('User document does not exist for userId:', userId);
      return NextResponse.redirect(new URL('/settings?error=user_not_found', request.url));
    }

    await adminDb.collection('users').doc(userId).update({
      googleRefreshToken: tokens.refresh_token,
      googleOAuthUpdatedAt: new Date(),
    });

    console.info('Refresh token saved successfully for userId:', userId);

    // 設定ページにリダイレクト（成功メッセージ付き）
    return NextResponse.redirect(new URL('/settings?success=oauth_connected', request.url));
  } catch (callbackError) {
    console.error('OAuth callback error:', callbackError);
    return NextResponse.redirect(
      new URL(
        `/settings?error=oauth_failed&message=${encodeURIComponent(callbackError instanceof Error ? callbackError.message : 'Unknown error')}`,
        request.url
      )
    );
  }
}
