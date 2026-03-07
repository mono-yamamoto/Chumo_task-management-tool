import { createMiddleware } from 'hono/factory';
import { createDb } from '../db';
import type { Database } from '../db';
import type { Env } from '../index';

/**
 * リクエストごとにDB接続を作成するミドルウェア
 */
export const dbMiddleware = createMiddleware<Env & { Variables: { db: Database } }>(
  async (c, next) => {
    const db = createDb(c.env.DATABASE_URL);
    c.set('db', db);
    await next();
  }
);
