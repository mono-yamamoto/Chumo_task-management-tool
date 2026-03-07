import { describe, it, expect, afterAll, afterEach, beforeEach } from 'vitest';
import { createTestApp, db, client } from './test-app';
import { cleanDatabase } from '../db/test-helpers';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

const app = createTestApp();

beforeEach(async () => {
  await db.insert(schema.tasks).values({
    id: 'task-c',
    projectType: 'MONO',
    title: 'コメント用タスク',
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

describe('Comments API', () => {
  describe('POST /api/comments', () => {
    it('コメントを作成できる', async () => {
      const res = await app.request('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-c',
          projectType: 'MONO',
          content: '<p>テストコメント</p>',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
    });
  });

  describe('GET /api/comments', () => {
    it('タスクのコメント一覧を取得できる', async () => {
      await db.insert(schema.taskComments).values({
        id: 'comment-1',
        taskId: 'task-c',
        projectType: 'MONO',
        authorId: 'test-user',
        content: 'コメント1',
        readBy: ['test-user'],
      });

      const res = await app.request('/api/comments?taskId=task-c&projectType=MONO');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.comments).toHaveLength(1);
      expect(body.comments[0].content).toBe('コメント1');
    });
  });

  describe('PUT /api/comments/:id', () => {
    it('コメントを更新できる', async () => {
      await db.insert(schema.taskComments).values({
        id: 'comment-edit',
        taskId: 'task-c',
        projectType: 'MONO',
        authorId: 'test-user',
        content: '更新前',
        readBy: ['test-user'],
      });

      const res = await app.request('/api/comments/comment-edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '更新後' }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('コメントを削除できる', async () => {
      await db.insert(schema.taskComments).values({
        id: 'comment-del',
        taskId: 'task-c',
        projectType: 'MONO',
        authorId: 'test-user',
        content: '削除用',
        readBy: ['test-user'],
      });

      const res = await app.request('/api/comments/comment-del', { method: 'DELETE' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/comments/mark-read', () => {
    it('コメントを既読にできる', async () => {
      await db.insert(schema.taskComments).values({
        id: 'comment-read',
        taskId: 'task-c',
        projectType: 'MONO',
        authorId: 'other-user',
        content: '未読コメント',
        readBy: ['other-user'],
      });

      const res = await app.request('/api/comments/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'task-c', projectType: 'MONO' }),
      });

      expect(res.status).toBe(200);

      // readByに追加されたか確認
      const [comment] = await db
        .select()
        .from(schema.taskComments)
        .where(eq(schema.taskComments.id, 'comment-read'));
      expect(comment.readBy).toContain('test-user');
    });
  });
});
