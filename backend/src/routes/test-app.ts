import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';
import type { Env } from '../index';
import type { Database } from '../db';
import tasksRoute from './tasks';
import commentsRoute from './comments';
import sessionsRoute from './sessions';
import usersRoute from './users';
import labelsRoute from './labels';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://chumo:chumo_dev@localhost:5432/chumo_dev';

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

/**
 * テスト用アプリ（認証バイパス + ローカルDB）
 * userId を "test-user" に固定
 */
type TestEnv = Env & { Variables: { db: Database; userId: string } };

export function createTestApp(testUserId = 'test-user') {
  const app = new Hono<TestEnv>();

  // DB + userId をテスト用に注入
  app.use('*', async (c, next) => {
    c.set('db', db as unknown as Database);
    c.set('userId', testUserId);
    await next();
  });

  app.route('/api/tasks', tasksRoute);
  app.route('/api/comments', commentsRoute);
  app.route('/api/sessions', sessionsRoute);
  app.route('/api/users', usersRoute);
  app.route('/api/labels', labelsRoute);

  return app;
}

export { db, client };
