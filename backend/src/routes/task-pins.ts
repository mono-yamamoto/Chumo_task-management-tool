import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, and, max } from 'drizzle-orm';
import { taskPins } from '../db/schema';
import { generateId } from '../lib/id';
import type { Env } from '../index';
import type { Database } from '../db';

type PinEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<PinEnv>();

const createPinSchema = z.object({
  taskId: z.string().min(1),
});

/**
 * GET /
 * ログインユーザーのピン一覧を取得
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');

  const result = await db
    .select()
    .from(taskPins)
    .where(eq(taskPins.userId, userId))
    .orderBy(taskPins.order);

  return c.json({ pins: result });
});

/**
 * POST /
 * タスクをピン留め
 */
app.post('/', zValidator('json', createPinSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const { taskId } = c.req.valid('json');

  const [existing] = await db
    .select({ id: taskPins.id })
    .from(taskPins)
    .where(and(eq(taskPins.userId, userId), eq(taskPins.taskId, taskId)));

  if (existing) {
    return c.json({ error: 'Already pinned' }, 409);
  }

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(taskPins.order) })
    .from(taskPins)
    .where(eq(taskPins.userId, userId));

  const newOrder = (maxOrder ?? -1) + 1;
  const id = generateId();
  const now = new Date();

  await db.insert(taskPins).values({
    id,
    userId,
    taskId,
    order: newOrder,
    pinnedAt: now,
  });

  return c.json({ pin: { id, taskId, order: newOrder, pinnedAt: now } }, 201);
});

/**
 * DELETE /:taskId
 * ピン解除（userId + taskId で特定）
 */
app.delete('/:taskId', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const taskId = c.req.param('taskId');

  const [existing] = await db
    .select({ id: taskPins.id })
    .from(taskPins)
    .where(and(eq(taskPins.userId, userId), eq(taskPins.taskId, taskId)));

  if (!existing) {
    return c.json({ error: 'Pin not found' }, 404);
  }

  await db.delete(taskPins).where(and(eq(taskPins.userId, userId), eq(taskPins.taskId, taskId)));

  return c.json({ success: true });
});

export default app;
