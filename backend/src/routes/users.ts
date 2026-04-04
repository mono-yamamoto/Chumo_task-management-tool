import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
import { createClerkClient } from '@clerk/backend';
import {
  users,
  userRoleEnum,
  tasks,
  taskSessions,
  taskComments,
  taskActivities,
  contacts,
  labels,
  projects,
} from '../db/schema';
import type { Env } from '../index';
import type { Database } from '../db';

type UserEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<UserEnv>();

// 安全な返却カラム（機密情報を除外）
const safeUserColumns = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  role: users.role,
  isAllowed: users.isAllowed,
  avatarUrl: users.avatarUrl,
  avatarColor: users.avatarColor,
  githubUsername: users.githubUsername,
  chatId: users.chatId,
  googleOAuthUpdatedAt: users.googleOAuthUpdatedAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

/**
 * GET /
 * ユーザー一覧（認証済みユーザーのみ、機密情報は除外）
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const result = await db.select(safeUserColumns).from(users);
  return c.json({ users: result });
});

/**
 * GET /me
 * 現在のユーザー情報
 * Clerk IDで見つからない場合、メールアドレスで検索しIDを移行する
 * （Firebase UID → Clerk ID 移行対応）
 */
app.get('/me', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');

  // まずClerk IDで検索
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (user) {
    return c.json({ user });
  }

  // Clerk IDで見つからない場合、Clerkからメールを取得してメールで検索
  try {
    const clerkClient = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    if (!email) {
      return c.json({ error: 'User not found' }, 404);
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, email));

    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // 旧ID(Firebase UID)から新ID(Clerk ID)へ全テーブルの参照を更新
    const oldId = existingUser.id;
    const newId = userId;

    await migrateUserId(db, oldId, newId);

    const [updatedUser] = await db.select().from(users).where(eq(users.id, newId));
    return c.json({ user: updatedUser });
  } catch (e) {
    console.error('User ID migration failed:', e);
    return c.json({ error: 'User not found' }, 404);
  }
});

/**
 * GET /:id
 * 指定ユーザーの情報を取得
 */
app.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const [user] = await db.select(safeUserColumns).from(users).where(eq(users.id, id));

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  avatarUrl: z.string().nullable().optional(),
  avatarColor: z.string().nullable().optional(),
  githubUsername: z.string().optional(),
  chatId: z.string().nullable().optional(),
  isAllowed: z.boolean().optional(),
  role: z.enum(userRoleEnum.enumValues).optional(),
  googleRefreshToken: z.string().nullable().optional(),
  googleOAuthUpdatedAt: z.string().nullable().optional(),
});

/**
 * PUT /:id
 * ユーザー情報を更新
 * 自分自身: displayName, githubUsername, chatId, Google OAuth 情報を更新可能
 * admin → 他ユーザー: isAllowed, chatId, role を更新可能
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

    // adminでも更新可能なフィールドはisAllowed, chatId, role
    const adminAllowed: Record<string, unknown> = {};
    if (body.isAllowed !== undefined) adminAllowed.isAllowed = body.isAllowed;
    if (body.chatId !== undefined) adminAllowed.chatId = body.chatId || null;
    if (body.role !== undefined) adminAllowed.role = body.role;

    if (Object.keys(adminAllowed).length === 0) {
      return c.json({ error: 'No updatable fields' }, 400);
    }

    const [updated] = await db
      .update(users)
      .set({ ...adminAllowed, updatedAt: new Date() })
      .where(eq(users.id, targetId))
      .returning(safeUserColumns);

    if (!updated) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: updated });
  }

  // 自分自身の更新（isAllowed, role は自己変更不可 — admin専用）
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.displayName !== undefined) updateData.displayName = body.displayName;
  if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
  if (body.avatarColor !== undefined) updateData.avatarColor = body.avatarColor;
  if (body.githubUsername !== undefined) updateData.githubUsername = body.githubUsername;
  if (body.chatId !== undefined) updateData.chatId = body.chatId || null;
  if (body.googleRefreshToken !== undefined)
    updateData.googleRefreshToken = body.googleRefreshToken;
  if (body.googleOAuthUpdatedAt !== undefined) {
    updateData.googleOAuthUpdatedAt = body.googleOAuthUpdatedAt
      ? new Date(body.googleOAuthUpdatedAt)
      : null;
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, targetId))
    .returning(safeUserColumns);

  if (!updated) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user: updated });
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(userRoleEnum.enumValues),
});

/**
 * POST /invite
 * メンバー招待（Clerk Invitation API + DBプレースホルダー作成）
 * admin権限が必要
 */
app.post('/invite', zValidator('json', inviteSchema), async (c) => {
  const db = c.get('db');
  const currentUserId = c.get('userId');
  const { email, role } = c.req.valid('json');

  // admin権限チェック
  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, currentUserId));

  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: '管理者権限が必要です' }, 403);
  }

  // 既存メール重複チェック
  const [existing] = await db
    .select({ id: users.id, isAllowed: users.isAllowed })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    // 無効化されたユーザーなら再有効化
    if (!existing.isAllowed) {
      await db
        .update(users)
        .set({ isAllowed: true, role, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
      return c.json({ success: true, restored: true });
    }
    return c.json({ error: 'このメールアドレスは既に登録されています' }, 409);
  }

  // DBにプレースホルダーユーザーを先に作成（整合性確保）
  const invitedId = `invited_${crypto.randomUUID()}`;
  await db.insert(users).values({
    id: invitedId,
    email,
    displayName: email.split('@')[0],
    role,
    isAllowed: true,
  });

  // Clerk 招待送信（DB insert 成功後）
  const clerkClient = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
  const appOrigin = c.env.APP_ORIGIN;

  try {
    await clerkClient.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${appOrigin}/login`,
    });
  } catch (e) {
    // Clerk失敗時はDBレコードを削除して補償
    await db
      .delete(users)
      .where(eq(users.id, invitedId))
      .catch(() => {});
    const message = e instanceof Error ? e.message : 'Clerk招待に失敗しました';
    return c.json({ error: message }, 500);
  }

  return c.json({ success: true });
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

/**
 * Firebase UID → Clerk ID へユーザーIDを移行する
 * users テーブルの主キーと、全テーブルのユーザーID参照を更新
 */
async function migrateUserId(db: Database, oldId: string, newId: string) {
  // neon-http ドライバーはトランザクション非対応のため逐次実行
  // ユーザーごとに1回きりの移行処理

  // users テーブルのID更新（最初に実行）
  await db.update(users).set({ id: newId, updatedAt: new Date() }).where(eq(users.id, oldId));

  // tasks.createdBy
  await db.update(tasks).set({ createdBy: newId }).where(eq(tasks.createdBy, oldId));

  // tasks.assigneeIds (配列内のID置換)
  await db.execute(
    sql`UPDATE tasks SET assignee_ids = array_replace(assignee_ids, ${oldId}, ${newId}) WHERE ${oldId} = ANY(assignee_ids)`
  );

  // task_sessions.userId
  await db.update(taskSessions).set({ userId: newId }).where(eq(taskSessions.userId, oldId));

  // task_comments.authorId
  await db.update(taskComments).set({ authorId: newId }).where(eq(taskComments.authorId, oldId));

  // task_comments.mentionedUserIds
  await db.execute(
    sql`UPDATE task_comments SET mentioned_user_ids = array_replace(mentioned_user_ids, ${oldId}, ${newId}) WHERE ${oldId} = ANY(mentioned_user_ids)`
  );

  // task_comments.readBy
  await db.execute(
    sql`UPDATE task_comments SET read_by = array_replace(read_by, ${oldId}, ${newId}) WHERE ${oldId} = ANY(read_by)`
  );

  // task_activities.actorId
  await db.update(taskActivities).set({ actorId: newId }).where(eq(taskActivities.actorId, oldId));

  // contacts.userId
  await db.update(contacts).set({ userId: newId }).where(eq(contacts.userId, oldId));

  // labels.ownerId
  await db.update(labels).set({ ownerId: newId }).where(eq(labels.ownerId, oldId));

  // projects.ownerId
  await db.update(projects).set({ ownerId: newId }).where(eq(projects.ownerId, oldId));

  // projects.memberIds
  await db.execute(
    sql`UPDATE projects SET member_ids = array_replace(member_ids, ${oldId}, ${newId}) WHERE ${oldId} = ANY(member_ids)`
  );
}

export default app;
