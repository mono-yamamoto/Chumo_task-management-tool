import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, and, isNull } from 'drizzle-orm';
import { taskSessions, tasks } from '../db/schema';
import { generateId } from '../lib/id';
import type { Env } from '../index';
import type { Database } from '../db';

type TimerEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<TimerEnv>();

const startTimerSchema = z.object({
  projectType: z.string(),
  taskId: z.string(),
});

const stopTimerSchema = z.object({
  projectType: z.string(),
  sessionId: z.string(),
});

/**
 * POST /start
 * タイマー開始（排他制御付き）
 * - 同一ユーザーの未終了セッションがある場合は400を返す
 */
app.post('/start', zValidator('json', startTimerSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const { projectType, taskId } = c.req.valid('json');

  // タスクの存在確認
  const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId));
  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // 排他制御: 同一ユーザーの未終了セッションをチェック
  const [activeSession] = await db
    .select({ id: taskSessions.id })
    .from(taskSessions)
    .where(and(eq(taskSessions.userId, userId), isNull(taskSessions.endedAt)));

  if (activeSession) {
    return c.json(
      {
        error: '他のタイマーが稼働中。停止してから開始してね',
        code: 'TIMER_ALREADY_RUNNING',
      },
      400
    );
  }

  // セッション作成
  const sessionId = generateId();
  await db.insert(taskSessions).values({
    id: sessionId,
    taskId,
    projectType: projectType as (typeof taskSessions.projectType.enumValues)[number],
    userId,
    startedAt: new Date(),
    endedAt: null,
    durationSec: 0,
  });

  return c.json({ success: true, sessionId });
});

/**
 * POST /stop
 * タイマー停止（durationSec自動計算）
 */
app.post('/stop', zValidator('json', stopTimerSchema), async (c) => {
  const db = c.get('db');
  const { sessionId } = c.req.valid('json');

  const [session] = await db.select().from(taskSessions).where(eq(taskSessions.id, sessionId));

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  if (session.endedAt) {
    return c.json({ error: 'Session already ended' }, 400);
  }

  const endedAt = new Date();
  const durationSec = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

  await db.update(taskSessions).set({ endedAt, durationSec }).where(eq(taskSessions.id, sessionId));

  return c.json({
    success: true,
    durationMin: Math.floor(durationSec / 60),
    durationSec,
  });
});

export default app;
