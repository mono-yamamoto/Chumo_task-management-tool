import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { taskSessions } from '../db/schema';
import { generateId } from '../lib/id';
import type { Env } from '../index';
import type { Database } from '../db';

type SessionEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<SessionEnv>();

const createSessionSchema = z.object({
  taskId: z.string(),
  projectType: z.string(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable().optional(),
  note: z.string().nullable().optional(),
});

const updateSessionSchema = z.object({
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().nullable().optional(),
  note: z.string().nullable().optional(),
});

/**
 * GET /
 * タスクのセッション一覧
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
    .from(taskSessions)
    .where(
      and(
        eq(taskSessions.taskId, taskId),
        eq(
          taskSessions.projectType,
          projectType as (typeof taskSessions.projectType.enumValues)[number]
        )
      )
    )
    .orderBy(desc(taskSessions.startedAt));

  return c.json({ sessions: result });
});

/**
 * GET /active
 * ユーザーのアクティブセッション（未終了）
 */
app.get('/active', async (c) => {
  const db = c.get('db');
  const userId = c.req.query('userId') ?? c.get('userId');

  const result = await db
    .select()
    .from(taskSessions)
    .where(and(eq(taskSessions.userId, userId), isNull(taskSessions.endedAt)))
    .orderBy(desc(taskSessions.startedAt));

  return c.json({ sessions: result });
});

/**
 * POST /
 * セッション作成（タイマー開始）
 */
app.post('/', zValidator('json', createSessionSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const data = c.req.valid('json');
  const id = generateId();

  let durationSec = 0;
  if (data.startedAt && data.endedAt) {
    durationSec = Math.floor((data.endedAt.getTime() - data.startedAt.getTime()) / 1000);
  }

  await db.insert(taskSessions).values({
    id,
    taskId: data.taskId,
    projectType: data.projectType as (typeof taskSessions.projectType.enumValues)[number],
    userId,
    startedAt: data.startedAt,
    endedAt: data.endedAt ?? null,
    durationSec,
    note: data.note ?? null,
  });

  return c.json({ id }, 201);
});

/**
 * PUT /:id
 * セッション更新（タイマー停止・編集）
 */
app.put('/:id', zValidator('json', updateSessionSchema), async (c) => {
  const db = c.get('db');
  const sessionId = c.req.param('id');
  const data = c.req.valid('json');

  const [existing] = await db.select().from(taskSessions).where(eq(taskSessions.id, sessionId));

  if (!existing) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // 所有者チェック
  const userId = c.get('userId');
  if (existing.userId !== userId) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // durationSec を再計算
  const startedAt = data.startedAt ?? existing.startedAt;
  const endedAt = data.endedAt !== undefined ? data.endedAt : existing.endedAt;
  let durationSec = existing.durationSec;
  if (startedAt && endedAt) {
    durationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
  }

  await db
    .update(taskSessions)
    .set({
      ...data,
      durationSec,
    })
    .where(eq(taskSessions.id, sessionId));

  return c.json({ success: true });
});

/**
 * DELETE /:id
 * セッション削除
 */
app.delete('/:id', async (c) => {
  const db = c.get('db');
  const sessionId = c.req.param('id');

  const [existing] = await db
    .select({ id: taskSessions.id, userId: taskSessions.userId })
    .from(taskSessions)
    .where(eq(taskSessions.id, sessionId));

  if (!existing) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // 所有者チェック
  const userId = c.get('userId');
  if (existing.userId !== userId) {
    return c.json({ error: 'Session not found' }, 404);
  }

  await db.delete(taskSessions).where(eq(taskSessions.id, sessionId));
  return c.json({ success: true });
});

export default app;
