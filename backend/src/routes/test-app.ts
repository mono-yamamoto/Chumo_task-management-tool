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
import timerRoute from './timer';
import reportsRoute from './reports';
import backlogRoute from './backlog';
import githubRoute from './github';
import contactRoute from './contact';
import chatRoute from './chat';
import driveRoute from './drive';
import notificationsRoute from './notifications';
import taskPinsRoute from './task-pins';
import { TEST_DATABASE_URL } from '../db/test-helpers';

const client = postgres(TEST_DATABASE_URL);
const db = drizzle(client, { schema });

/** テスト用env定数 */
export const TEST_ENV = {
  BACKLOG_WEBHOOK_SECRET: 'test-webhook-secret',
  INTERNAL_API_KEY: 'test_internal_key',
  CLERK_SECRET_KEY: 'test_secret_key',
} as const;

/**
 * テスト用アプリ（認証バイパス + ローカルDB）
 * userId を "test-user" に固定
 */
type TestEnv = Env & { Variables: { db: Database; userId: string } };

export function createTestApp(testUserId = 'test-user') {
  const app = new Hono<TestEnv>();

  // DB + userId + env をテスト用に注入
  app.use('*', async (c, next) => {
    c.set('db', db as unknown as Database);
    c.set('userId', testUserId);
    (c.env as any) = { ...c.env, ...TEST_ENV };
    await next();
  });

  app.route('/api/tasks', tasksRoute);
  app.route('/api/comments', commentsRoute);
  app.route('/api/sessions', sessionsRoute);
  app.route('/api/users', usersRoute);
  app.route('/api/labels', labelsRoute);
  app.route('/api/timer', timerRoute);
  app.route('/api/reports', reportsRoute);
  app.route('/api/backlog', backlogRoute);
  app.route('/api/github', githubRoute);
  app.route('/api/contact', contactRoute);
  app.route('/api/chat', chatRoute);
  app.route('/api/drive', driveRoute);
  app.route('/api/notifications', notificationsRoute);
  app.route('/api/task-pins', taskPinsRoute);

  return app;
}

export { db, client };
