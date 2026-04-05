import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, and, sql } from 'drizzle-orm';
import { taskComments } from '../db/schema';
import { generateId } from '../lib/id';
import { createMentionNotifications } from '../lib/notifications';
import type { Env } from '../index';
import type { Database } from '../db';

type CommentEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<CommentEnv>();

const createCommentSchema = z.object({
  taskId: z.string(),
  projectType: z.string(),
  content: z.string().min(1),
  mentionedUserIds: z.array(z.string()).optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1),
  mentionedUserIds: z.array(z.string()).optional(),
});

/**
 * GET /
 * タスクのコメント一覧
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const taskId = c.req.query('taskId');
  const projectType = c.req.query('projectType');

  if (!taskId || !projectType) {
    return c.json({ error: 'taskId and projectType are required' }, 400);
  }

  const result = await db
    .select()
    .from(taskComments)
    .where(
      and(
        eq(taskComments.taskId, taskId),
        eq(
          taskComments.projectType,
          projectType as (typeof taskComments.projectType.enumValues)[number]
        )
      )
    )
    .orderBy(taskComments.createdAt);

  return c.json({ comments: result });
});

/**
 * GET /unread
 * 未読コメントがあるタスクID一覧
 */
app.get('/unread', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');

  // readBy配列に自分のIDが含まれていないコメントのtaskIdを取得
  const result = await db
    .selectDistinct({ taskId: taskComments.taskId })
    .from(taskComments)
    .where(sql`NOT (${taskComments.readBy} @> ARRAY[${userId}]::text[])`);

  return c.json({ taskIds: result.map((r) => r.taskId) });
});

/**
 * POST /
 * コメント作成
 */
app.post('/', zValidator('json', createCommentSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const data = c.req.valid('json');
  const id = generateId();
  const now = new Date();

  await db.insert(taskComments).values({
    id,
    taskId: data.taskId,
    projectType: data.projectType as (typeof taskComments.projectType.enumValues)[number],
    authorId: userId,
    content: data.content,
    mentionedUserIds: data.mentionedUserIds ?? [],
    readBy: [userId],
    createdAt: now,
    updatedAt: now,
  });

  // メンション通知を作成（失敗してもコメント自体は保存済み）
  if (data.mentionedUserIds && data.mentionedUserIds.length > 0) {
    try {
      await createMentionNotifications(db, {
        taskId: data.taskId,
        commentId: id,
        authorId: userId,
        content: data.content,
        mentionedUserIds: data.mentionedUserIds,
      });
    } catch (e) {
      console.error('Failed to create mention notifications:', e);
    }
  }

  return c.json({ id }, 201);
});

/**
 * PUT /:id
 * コメント更新
 */
app.put('/:id', zValidator('json', updateCommentSchema), async (c) => {
  const db = c.get('db');
  const commentId = c.req.param('id');
  const data = c.req.valid('json');

  const [existing] = await db
    .select({ id: taskComments.id })
    .from(taskComments)
    .where(eq(taskComments.id, commentId));

  if (!existing) {
    return c.json({ error: 'Comment not found' }, 404);
  }

  await db
    .update(taskComments)
    .set({
      content: data.content,
      mentionedUserIds: data.mentionedUserIds,
      updatedAt: new Date(),
    })
    .where(eq(taskComments.id, commentId));

  return c.json({ success: true });
});

/**
 * DELETE /:id
 * コメント削除
 */
app.delete('/:id', async (c) => {
  const db = c.get('db');
  const commentId = c.req.param('id');

  const [existing] = await db
    .select({ id: taskComments.id })
    .from(taskComments)
    .where(eq(taskComments.id, commentId));

  if (!existing) {
    return c.json({ error: 'Comment not found' }, 404);
  }

  await db.delete(taskComments).where(eq(taskComments.id, commentId));
  return c.json({ success: true });
});

/**
 * POST /mark-read
 * タスクのコメントを既読にする
 */
app.post('/mark-read', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const { taskId, projectType } = await c.req.json<{ taskId: string; projectType: string }>();

  if (!taskId || !projectType) {
    return c.json({ error: 'taskId and projectType are required' }, 400);
  }

  // readBy配列にuserIdを追加（まだ含まれていない場合）
  await db
    .update(taskComments)
    .set({
      readBy: sql`array_append(${taskComments.readBy}, ${userId})`,
    })
    .where(
      and(
        eq(taskComments.taskId, taskId),
        eq(
          taskComments.projectType,
          projectType as (typeof taskComments.projectType.enumValues)[number]
        ),
        sql`NOT (${taskComments.readBy} @> ARRAY[${userId}]::text[])`
      )
    );

  return c.json({ success: true });
});

export default app;
