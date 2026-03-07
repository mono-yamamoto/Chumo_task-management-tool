import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
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

/**
 * GET /:id
 * 指定ユーザーの情報を取得
 */
app.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const [user] = await db.select().from(users).where(eq(users.id, id));

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

const updateUserSchema = z.object({
  githubUsername: z.string().optional(),
  chatId: z.string().nullable().optional(),
  isAllowed: z.boolean().optional(),
  googleRefreshToken: z.string().nullable().optional(),
  googleOAuthUpdatedAt: z.string().nullable().optional(),
});

/**
 * PUT /:id
 * ユーザー情報を更新
 * 自分自身のみ更新可能（adminは他ユーザーのisAllowed/chatIdを更新可能）
 */
app.put('/:id', zValidator('json', updateUserSchema), async (c) => {
  const db = c.get('db');
  const currentUserId = c.get('userId');
  const targetId = c.req.param('id');
  const body = c.req.valid('json');

  // 自分自身でない場合、adminかチェック
  if (currentUserId !== targetId) {
    const [currentUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, currentUserId));

    if (!currentUser || currentUser.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // adminでも更新可能なフィールドはisAllowed, chatIdのみ
    const adminAllowed: Record<string, unknown> = {};
    if (body.isAllowed !== undefined) adminAllowed.isAllowed = body.isAllowed;
    if (body.chatId !== undefined) adminAllowed.chatId = body.chatId || null;

    if (Object.keys(adminAllowed).length === 0) {
      return c.json({ error: 'No updatable fields' }, 400);
    }

    await db
      .update(users)
      .set({ ...adminAllowed, updatedAt: new Date() })
      .where(eq(users.id, targetId));

    const [updated] = await db.select().from(users).where(eq(users.id, targetId));
    return c.json({ user: updated });
  }

  // 自分自身の更新
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.githubUsername !== undefined) updateData.githubUsername = body.githubUsername;
  if (body.chatId !== undefined) updateData.chatId = body.chatId || null;
  if (body.isAllowed !== undefined) updateData.isAllowed = body.isAllowed;
  if (body.googleRefreshToken !== undefined)
    updateData.googleRefreshToken = body.googleRefreshToken;
  if (body.googleOAuthUpdatedAt !== undefined) {
    updateData.googleOAuthUpdatedAt = body.googleOAuthUpdatedAt
      ? new Date(body.googleOAuthUpdatedAt)
      : null;
  }

  await db.update(users).set(updateData).where(eq(users.id, targetId));

  const [updated] = await db.select().from(users).where(eq(users.id, targetId));
  return c.json({ user: updated });
});

/**
 * POST /me/fcm-tokens
 * FCMトークンを追加
 */
app.post('/me/fcm-tokens', zValidator('json', z.object({ token: z.string() })), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const { token } = c.req.valid('json');

  // array_append で重複を避けつつ追加
  await db
    .update(users)
    .set({
      fcmTokens: sql`array_append(
          COALESCE(${users.fcmTokens}, ARRAY[]::text[]),
          ${token}
        )`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return c.json({ success: true });
});

/**
 * DELETE /me/fcm-tokens
 * FCMトークンを削除
 */
app.delete('/me/fcm-tokens', zValidator('json', z.object({ token: z.string() })), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const { token } = c.req.valid('json');

  await db
    .update(users)
    .set({
      fcmTokens: sql`array_remove(COALESCE(${users.fcmTokens}, ARRAY[]::text[]), ${token})`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return c.json({ success: true });
});

export default app;
