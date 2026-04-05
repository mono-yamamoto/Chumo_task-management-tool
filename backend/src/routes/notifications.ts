import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { notifications, tasks } from '../db/schema';
import {
  createMentionNotifications,
  createSessionReminderNotifications,
} from '../lib/notifications';
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
  const uniqueTargetUserIds = [...new Set(data.targetUserIds)];

  // 通知作成 + sessionReminders更新をトランザクションで実行
  const sentCount = await db.transaction(async (tx) => {
    const count = await createSessionReminderNotifications(tx, {
      taskId: data.taskId,
      targetUserIds: uniqueTargetUserIds,
      senderId: userId,
    });

    const now = new Date().toISOString();
    const newReminders: Record<string, { sentAt: string; sentBy: string }> = {};
    for (const uid of uniqueTargetUserIds) {
      newReminders[uid] = { sentAt: now, sentBy: userId };
    }

    await tx
      .update(tasks)
      .set({
        sessionReminders: sql`COALESCE(${tasks.sessionReminders}, '{}'::jsonb) || ${JSON.stringify(newReminders)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, data.taskId));

    return count;
  });

  return c.json({ success: true, sentCount });
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
