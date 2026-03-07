import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createHmac } from 'crypto';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

// リダイレクトURIの構築
function getRedirectUri(): string {
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

// OAuth2クライアントの取得
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

// stateトークンの検証
function verifyStateToken(stateToken: string): string | null {
  try {
    const secret = process.env.OAUTH_STATE_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
    const decoded = Buffer.from(stateToken, 'base64url').toString('utf-8');

    const lastColonIndex = decoded.lastIndexOf(':');
    if (lastColonIndex === -1) return null;

    const payload = decoded.substring(0, lastColonIndex);
    const signature = decoded.substring(lastColonIndex + 1);

    if (!payload || !signature) return null;

    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) return null;

    const parts = payload.split(':');
    if (parts.length < 3) return null;

    const [userId, nonce, timestamp] = parts;
    if (!userId || !nonce || !timestamp) return null;

    const timestampMs = parseInt(timestamp, 10);
    if (Number.isNaN(timestampMs)) return null;

    const tokenAge = Date.now() - timestampMs;
    const maxAge = 30 * 60 * 1000;
    if (tokenAge > maxAge || tokenAge < 0) return null;

    return userId;
  } catch {
    return null;
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

  const userId = verifyStateToken(stateToken);
  if (!userId) {
    console.error('Invalid or expired state token');
    return NextResponse.redirect(new URL('/settings?error=invalid_state', request.url));
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL('/settings?error=no_refresh_token', request.url));
    }

    // バックエンドAPIを通じてリフレッシュトークンを保存
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_API_KEY,
        'X-Internal-User-Id': userId,
      },
      body: JSON.stringify({
        googleRefreshToken: tokens.refresh_token,
        googleOAuthUpdatedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to save refresh token:', errorData);
      return NextResponse.redirect(new URL('/settings?error=save_failed', request.url));
    }

    console.info('Refresh token saved successfully for userId:', userId);

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
