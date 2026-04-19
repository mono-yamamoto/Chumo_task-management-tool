import { describe, it, expect, afterAll, afterEach, beforeEach } from 'vitest';
import { createTestApp, db, client } from './test-app';
import { cleanDatabase } from '../db/test-helpers';
import * as schema from '../db/schema';

const app = createTestApp();

beforeEach(async () => {
  // task_pinsにはtasks FKがあるのでタスクを先に作成
  await db.insert(schema.tasks).values([
    {
      id: 'task-1',
      projectType: 'MONO',
      title: 'タスク1',
      kubunLabelId: 'label-1',
      order: 1,
      createdBy: 'test-user',
    },
    {
      id: 'task-2',
      projectType: 'MONO',
      title: 'タスク2',
      kubunLabelId: 'label-1',
      order: 2,
      createdBy: 'test-user',
    },
    {
      id: 'task-a',
      projectType: 'MONO',
      title: 'タスクA',
      kubunLabelId: 'label-1',
      order: 3,
      createdBy: 'test-user',
    },
    {
      id: 'task-b',
      projectType: 'MONO',
      title: 'タスクB',
      kubunLabelId: 'label-1',
      order: 4,
      createdBy: 'test-user',
    },
  ]);
});

afterEach(async () => {
  await cleanDatabase(db);
});

afterAll(async () => {
  await client.end();
});

describe('Task Pins API', () => {
  describe('GET /api/task-pins', () => {
    it('ピンなしで空配列を返す', async () => {
      const res = await app.request('/api/task-pins');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.pins).toHaveLength(0);
    });

    it('ピン一覧をorder順で取得できる', async () => {
      await db.insert(schema.taskPins).values([
        { id: 'pin-1', userId: 'test-user', taskId: 'task-a', order: 1, pinnedAt: new Date() },
        { id: 'pin-2', userId: 'test-user', taskId: 'task-b', order: 0, pinnedAt: new Date() },
      ]);

      const res = await app.request('/api/task-pins');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.pins).toHaveLength(2);
      expect(body.pins[0].taskId).toBe('task-b');
      expect(body.pins[1].taskId).toBe('task-a');
    });
  });

  describe('POST /api/task-pins', () => {
    it('ピンを作成できる', async () => {
      const res = await app.request('/api/task-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'task-1' }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.pin.taskId).toBe('task-1');
      expect(body.pin.order).toBe(0);
    });

    it('2つ目のピンはorderがインクリメントされる', async () => {
      await app.request('/api/task-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'task-1' }),
      });

      const res = await app.request('/api/task-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'task-2' }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.pin.order).toBe(1);
    });

    it('重複ピンは409を返す', async () => {
      await app.request('/api/task-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'task-1' }),
      });

      const res = await app.request('/api/task-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'task-1' }),
      });

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/task-pins/:taskId', () => {
    it('ピンを削除できる', async () => {
      await app.request('/api/task-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'task-1' }),
      });

      const res = await app.request('/api/task-pins/task-1', { method: 'DELETE' });
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.success).toBe(true);

      // 削除後は空
      const listRes = await app.request('/api/task-pins');
      const listBody = (await listRes.json()) as any;
      expect(listBody.pins).toHaveLength(0);
    });

    it('存在しないピンは404を返す', async () => {
      const res = await app.request('/api/task-pins/nonexistent', { method: 'DELETE' });
      expect(res.status).toBe(404);
    });
  });
});
