import { describe, it, expect, afterAll, afterEach, beforeEach } from 'vitest';
import { createTestApp, db, client } from './test-app';
import { cleanDatabase } from '../db/test-helpers';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

const app = createTestApp();

beforeEach(async () => {
  await db.insert(schema.tasks).values({
    id: 'task-s',
    projectType: 'MONO',
    title: 'セッション用タスク',
    kubunLabelId: 'label-1',
    order: 1,
    createdBy: 'test-user',
  });
});

afterEach(async () => {
  await cleanDatabase(db);
});

afterAll(async () => {
  await client.end();
});

describe('Sessions API', () => {
  describe('POST /api/sessions', () => {
    it('セッションを作成できる（タイマー開始）', async () => {
      const res = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-s',
          projectType: 'MONO',
          startedAt: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
    });

    it('endedAt付きで作成するとdurationSecが計算される', async () => {
      const start = new Date('2026-01-01T10:00:00Z');
      const end = new Date('2026-01-01T11:30:00Z');

      const res = await app.request('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-s',
          projectType: 'MONO',
          startedAt: start.toISOString(),
          endedAt: end.toISOString(),
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();

      const [session] = await db
        .select()
        .from(schema.taskSessions)
        .where(eq(schema.taskSessions.id, body.id));
      expect(session.durationSec).toBe(5400); // 1.5h = 5400sec
    });
  });

  describe('GET /api/sessions', () => {
    it('タスクのセッション一覧を取得できる', async () => {
      await db.insert(schema.taskSessions).values({
        id: 'session-1',
        taskId: 'task-s',
        projectType: 'MONO',
        userId: 'test-user',
        startedAt: new Date(),
        durationSec: 0,
      });

      const res = await app.request('/api/sessions?taskId=task-s&projectType=MONO');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.sessions).toHaveLength(1);
    });
  });

  describe('GET /api/sessions/active', () => {
    it('アクティブセッション（endedAt=null）を取得できる', async () => {
      await db.insert(schema.taskSessions).values([
        {
          id: 'session-active',
          taskId: 'task-s',
          projectType: 'MONO',
          userId: 'test-user',
          startedAt: new Date(),
          endedAt: null,
          durationSec: 0,
        },
        {
          id: 'session-done',
          taskId: 'task-s',
          projectType: 'MONO',
          userId: 'test-user',
          startedAt: new Date(),
          endedAt: new Date(),
          durationSec: 100,
        },
      ]);

      const res = await app.request('/api/sessions/active');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.sessions).toHaveLength(1);
      expect(body.sessions[0].id).toBe('session-active');
    });
  });

  describe('PUT /api/sessions/:id', () => {
    it('セッションを更新できる（タイマー停止）', async () => {
      const startedAt = new Date('2026-01-01T10:00:00Z');
      await db.insert(schema.taskSessions).values({
        id: 'session-stop',
        taskId: 'task-s',
        projectType: 'MONO',
        userId: 'test-user',
        startedAt,
        durationSec: 0,
      });

      const endedAt = new Date('2026-01-01T10:30:00Z');
      const res = await app.request('/api/sessions/session-stop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endedAt: endedAt.toISOString() }),
      });

      expect(res.status).toBe(200);

      const [session] = await db
        .select()
        .from(schema.taskSessions)
        .where(eq(schema.taskSessions.id, 'session-stop'));
      expect(session.durationSec).toBe(1800); // 30min
      expect(session.endedAt).not.toBeNull();
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('セッションを削除できる', async () => {
      await db.insert(schema.taskSessions).values({
        id: 'session-del',
        taskId: 'task-s',
        projectType: 'MONO',
        userId: 'test-user',
        startedAt: new Date(),
        durationSec: 0,
      });

      const res = await app.request('/api/sessions/session-del', { method: 'DELETE' });
      expect(res.status).toBe(200);
    });
  });
});
