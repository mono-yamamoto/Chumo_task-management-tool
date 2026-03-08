/**
 * ランダムなID生成（Firestore互換の20文字）
 */
export function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(20));
  for (const byte of bytes) {
    result += chars[byte % chars.length];
  }
  return result;
}
