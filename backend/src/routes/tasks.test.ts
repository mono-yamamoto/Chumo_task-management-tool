import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { createTestApp, db, client } from './test-app';
import { cleanDatabase } from '../db/test-helpers';
import * as schema from '../db/schema';

const app = createTestApp();

afterEach(async () => {
  await cleanDatabase(db);
});

afterAll(async () => {
  await client.end();
});

describe('Tasks API', () => {
  describe('POST /api/tasks', () => {
    it('タスクを作成できる', async () => {
      const res = await app.request('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          title: 'テストタスク',
          kubunLabelId: 'label-1',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(typeof body.id).toBe('string');
    });

    it('タイトルなしだと400', async () => {
      const res = await app.request('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: 'MONO',
          kubunLabelId: 'label-1',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks', () => {
    it('プロジェクトタイプ別にタスク一覧を取得できる', async () => {
      // Seed
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
          id: 'task-3',
          projectType: 'BRGREG',
          title: '別プロジェクト',
          kubunLabelId: 'label-1',
          order: 1,
          createdBy: 'test-user',
        },
      ]);

      const res = await app.request('/api/tasks?projectType=MONO');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.tasks).toHaveLength(2);
      expect(body.tasks.every((t: { projectType: string }) => t.projectType === 'MONO')).toBe(true);
    });

    it('projectType未指定だと400', async () => {
      const res = await app.request('/api/tasks');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('タスク詳細を取得できる', async () => {
      await db.insert(schema.tasks).values({
        id: 'task-detail',
        projectType: 'MONO',
        title: '詳細タスク',
        description: '説明文',
        kubunLabelId: 'label-1',
        order: 1,
        createdBy: 'test-user',
      });

      const res = await app.request('/api/tasks/task-detail');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.task.title).toBe('詳細タスク');
      expect(body.task.description).toBe('説明文');
    });

    it('存在しないIDだと404', async () => {
      const res = await app.request('/api/tasks/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('タスクを更新できる', async () => {
      await db.insert(schema.tasks).values({
        id: 'task-update',
        projectType: 'MONO',
        title: '更新前',
        kubunLabelId: 'label-1',
        order: 1,
        createdBy: 'test-user',
      });

      const res = await app.request('/api/tasks/task-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '更新後',
          flowStatus: 'コーディング',
        }),
      });

      expect(res.status).toBe(200);

      // 更新を確認
      const getRes = await app.request('/api/tasks/task-update');
      const body = await getRes.json();
      expect(body.task.title).toBe('更新後');
      expect(body.task.flowStatus).toBe('コーディング');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('タスクを削除できる', async () => {
      await db.insert(schema.tasks).values({
        id: 'task-delete',
        projectType: 'MONO',
        title: '削除用',
        kubunLabelId: 'label-1',
        order: 1,
        createdBy: 'test-user',
      });

      const res = await app.request('/api/tasks/task-delete', { method: 'DELETE' });
      expect(res.status).toBe(200);

      const getRes = await app.request('/api/tasks/task-delete');
      expect(getRes.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/order', () => {
    it('複数タスクのorderを一括更新できる', async () => {
      await db.insert(schema.tasks).values([
        {
          id: 'order-1',
          projectType: 'MONO',
          title: 'タスク1',
          kubunLabelId: 'label-1',
          order: 1,
          createdBy: 'test-user',
        },
        {
          id: 'order-2',
          projectType: 'MONO',
          title: 'タスク2',
          kubunLabelId: 'label-1',
          order: 2,
          createdBy: 'test-user',
        },
      ]);

      const res = await app.request('/api/tasks/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            { taskId: 'order-1', projectType: 'MONO', newOrder: 10 },
            { taskId: 'order-2', projectType: 'MONO', newOrder: 20 },
          ],
        }),
      });

      expect(res.status).toBe(200);
    });
  });
});
