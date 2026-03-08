import { Hono } from 'hono';
import { eq, isNull, or } from 'drizzle-orm';
import { labels } from '../db/schema';
import type { Env } from '../index';
import type { Database } from '../db';

type LabelEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<LabelEnv>();

/**
 * GET /
 * ラベル一覧（区分ラベル = projectId が null のもの）
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const projectId = c.req.query('projectId');

  const result = projectId
    ? await db
        .select()
        .from(labels)
        .where(or(eq(labels.projectId, projectId), isNull(labels.projectId)))
    : await db.select().from(labels).where(isNull(labels.projectId));

  return c.json({ labels: result });
});

export default app;
