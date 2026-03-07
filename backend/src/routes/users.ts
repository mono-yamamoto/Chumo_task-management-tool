import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import type { Env } from '../index';
import type { Database } from '../db';

type UserEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<UserEnv>();

/**
 * GET /
 * ユーザー一覧
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const result = await db.select().from(users);
  return c.json({ users: result });
});

/**
 * GET /me
 * 現在のユーザー情報
 */
app.get('/me', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');

  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

export default app;
