import { createMiddleware } from 'hono/factory';
import { verifyToken } from '@clerk/backend';
import type { Env } from '../index';

/**
 * Clerk JWT検証ミドルウェア
 * Authorization: Bearer <token> からユーザーIDを抽出して c.set('userId', ...) にセット
 */
export const authMiddleware = createMiddleware<Env & { Variables: { userId: string } }>(
  async (c, next) => {
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
