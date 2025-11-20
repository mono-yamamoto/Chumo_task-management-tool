import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createHmac, randomBytes } from 'crypto';

// 環境変数の検証
if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
  throw new Error(
    'GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in environment variables'
  );
}

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

  // 署名付きstateトークンを生成（CSRF攻撃を防ぐ）
  const stateToken = generateStateToken(userId);

  // OAuth認証URLを生成
  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // リフレッシュトークンを確実に取得するため
    state: stateToken, // 署名付きトークンを使用
  });

  return NextResponse.json({ authUrl });
}
