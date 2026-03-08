import { createMiddleware } from 'hono/factory';
import { verifyToken } from '@clerk/backend';
import type { Env } from '../index';

// ミドルウェアをスキップするパス
const SKIP_PATHS = ['/api/files/'];

/**
 * Clerk JWT検証ミドルウェア
 * Authorization: Bearer <token> からユーザーIDを抽出して c.set('userId', ...) にセット
 * サーバー間通信用に X-Internal-Key + X-Internal-User-Id ヘッダーも受け付ける
 */
export const authMiddleware = createMiddleware<Env & { Variables: { userId: string } }>(
  async (c, next) => {
    if (SKIP_PATHS.some((p) => c.req.path.startsWith(p))) {
      return next();
    }

    // サーバー間通信（内部APIキー認証）
    const internalKey = c.req.header('X-Internal-Key');
    const internalUserId = c.req.header('X-Internal-User-Id');
    if (
      internalKey &&
      internalUserId &&
      c.env.INTERNAL_API_KEY &&
      internalKey === c.env.INTERNAL_API_KEY
    ) {
      c.set('userId', internalUserId);
      return await next();
    }

    // Clerk JWT認証
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verifyToken(token, {
        secretKey: c.env.CLERK_SECRET_KEY,
      });

      c.set('userId', payload.sub);
      await next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  }
);
