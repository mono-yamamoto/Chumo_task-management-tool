import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createHmac, randomBytes } from 'crypto';

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

// OAuth2クライアントの取得（環境変数チェック付き）
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in environment variables'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

// stateトークンの生成（HMAC署名付き）
function generateStateToken(userId: string): string {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  const nonce = randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${userId}:${nonce}:${timestamp}`;

  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');

  // base64エンコードして返す（URL-safe）
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // デバッグ情報をログ出力
  const redirectUri = getRedirectUri();
  console.debug('[OAuth Debug] Redirect URI being used:', redirectUri);
  console.debug('[OAuth Debug] Environment variables:', {
    GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI ? 'SET' : 'NOT SET',
    SERVER_URL: process.env.SERVER_URL ? 'SET' : 'NOT SET',
    NEXT_PUBLIC_FUNCTIONS_URL: process.env.NEXT_PUBLIC_FUNCTIONS_URL || 'NOT SET',
  });

  // 署名付きstateトークンを生成（CSRF攻撃を防ぐ）
  const stateToken = generateStateToken(userId);

  // OAuth認証URLを生成
  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
  ];

  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // リフレッシュトークンを確実に取得するため
    state: stateToken, // 署名付きトークンを使用
  });

  return NextResponse.json({ authUrl });
}
