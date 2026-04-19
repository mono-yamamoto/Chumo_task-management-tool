import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { notifications, tasks, users } from '../db/schema';
import { createMentionNotifications } from '../lib/notifications';
import { generateId } from '../lib/id';
import type { Env } from '../index';
import type { Database } from '../db';

type NotificationEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<NotificationEnv>();

/**
 * GET /
 * 自分の通知一覧
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const rawLimit = Number(c.req.query('limit') || '20');
  const rawOffset = Number(c.req.query('offset') || '0');
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 50) : 20;
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const result = await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;

  return c.json({ notifications: items, hasMore });
});

/**
 * GET /unread-count
 * 未読通知件数（バッジ用）
 */
app.get('/unread-count', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));

  return c.json({ count: row?.count ?? 0 });
});

/**
 * POST /mark-read
 * 通知を既読にする
 */
const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

app.post('/mark-read', zValidator('json', markReadSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const data = c.req.valid('json');

  if (data.all) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));
  } else if (data.notificationIds && data.notificationIds.length > 0) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.recipientId, userId), inArray(notifications.id, data.notificationIds))
      );
  }

  return c.json({ success: true });
});

/**
 * POST /session-reminder
 * セッション未記録通知を送信
 */
const sessionReminderSchema = z.object({
  taskId: z.string(),
  targetUserIds: z.array(z.string()).min(1),
});

app.post('/session-reminder', zValidator('json', sessionReminderSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const data = c.req.valid('json');

  // 権限チェック: 送信者がタスクのアサイニーまたはadminであること
  // title は後段の通知本文で使うので同時に取得
  const [[task], [currentUser]] = await Promise.all([
    db
      .select({ assigneeIds: tasks.assigneeIds, title: tasks.title })
      .from(tasks)
      .where(eq(tasks.id, data.taskId)),
    db.select({ role: users.role }).from(users).where(eq(users.id, userId)),
  ]);
  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }
  if (currentUser?.role !== 'admin' && !task.assigneeIds.includes(userId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const uniqueTargetUserIds = [...new Set(data.targetUserIds)];
  const rows = uniqueTargetUserIds.map((recipientId) => ({
    id: generateId(),
    recipientId,
    type: 'session_reminder' as const,
    title: 'セッション未記録のお知らせ',
    body: `タスク『${task.title}』のセッションが未記録です`,
    taskId: data.taskId,
    actorId: userId,
  }));

  const now = new Date().toISOString();
  const newReminders: Record<string, { sentAt: string; sentBy: string }> = {};
  for (const uid of uniqueTargetUserIds) {
    newReminders[uid] = { sentAt: now, sentBy: userId };
  }

  const remindersMergeSql = sql`COALESCE(${tasks.sessionReminders}, '{}'::jsonb) || ${JSON.stringify(newReminders)}::jsonb`;
  const taskWhere = eq(tasks.id, data.taskId);

  // neon-http は batch() のみ、postgres-js は transaction() のみ対応のため実行時分岐
  if ('batch' in db && typeof db.batch === 'function') {
    await db.batch([
      db.insert(notifications).values(rows),
      db
        .update(tasks)
        .set({ sessionReminders: remindersMergeSql, updatedAt: new Date() })
        .where(taskWhere),
    ]);
  } else {
    await db.transaction(async (tx) => {
      await tx.insert(notifications).values(rows);
      await tx
        .update(tasks)
        .set({ sessionReminders: remindersMergeSql, updatedAt: new Date() })
        .where(taskWhere);
    });
  }

  return c.json({ success: true, sentCount: rows.length });
});

/**
 * POST /mention
 * メンション通知（互換性維持）
 */
const mentionNotificationSchema = z.object({
  taskId: z.string(),
  commentId: z.string(),
  content: z.string(),
  mentionedUserIds: z.array(z.string()),
  projectType: z.string(),
});

app.post('/mention', zValidator('json', mentionNotificationSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const data = c.req.valid('json');

  const sentCount = await createMentionNotifications(db, {
    taskId: data.taskId,
    commentId: data.commentId,
    authorId: userId,
    content: data.content,
    mentionedUserIds: [...new Set(data.mentionedUserIds)],
  });

  return c.json({ success: true, sent: sentCount });
});

export default app;
