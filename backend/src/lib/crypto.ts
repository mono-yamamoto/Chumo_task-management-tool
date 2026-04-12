/**
 * HMAC-SHA256 署名ユーティリティ（Web Crypto API）
 * ファイルURL署名・OAuth state署名で共用
 */

export async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function verifyHmac(
  secret: string,
  data: string,
  signatureB64: string
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );
    return await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  } catch {
    return false;
  }
}

/** 署名付きファイルURL を生成 */
export async function generateSignedFileUrl(
  baseUrl: string,
  key: string,
  secret: string,
  ttlMs: number = 24 * 60 * 60 * 1000
): Promise<string> {
  const exp = String(Date.now() + ttlMs);
  const token = await hmacSign(secret, key + exp);
  return `${baseUrl}/api/files/${key}?token=${token}&exp=${exp}`;
}
