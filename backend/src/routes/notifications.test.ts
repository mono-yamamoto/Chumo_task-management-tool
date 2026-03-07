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

describe('Notifications API', () => {
  describe('POST /api/notifications/mention', () => {
    async function seedNotificationData() {
      await db.insert(schema.users).values([
        {
          id: 'author-user',
          email: 'author@test.com',
          displayName: '投稿者',
          role: 'member',
          isAllowed: true,
        },
        {
          id: 'mentioned-user',
          email: 'mentioned@test.com',
          displayName: 'メンション対象',
          role: 'member',
          isAllowed: true,
          fcmTokens: ['token-1', 'token-2'],
        },
        {
          id: 'no-token-user',
          email: 'notoken@test.com',
          displayName: 'トークンなし',
          role: 'member',
          isAllowed: true,
        },
      ]);

      await db.insert(schema.tasks).values({
        id: 'task-notify',
        projectType: 'MONO',
        title: '通知テスト用タスク',
        kubunLabelId: 'label-1',
        order: 1,
        createdBy: 'author-user',
      });
    }

    it('メンション通知を構築できる', async () => {
      await seedNotificationData();

      const res = await app.request('/api/notifications/mention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-notify',
          commentId: 'comment-1',
          authorId: 'author-user',
          content: '<p>テストコメント</p>',
          mentionedUserIds: ['mentioned-user'],
          projectType: 'MONO',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.sent).toBe(2); // token-1, token-2
      expect(body.notification.title).toContain('投稿者');
      expect(body.notification.body).toContain('通知テスト用タスク');
      expect(body.notification.body).toContain('テストコメント');
    });

    it('自分自身へのメンションは除外される', async () => {
      await seedNotificationData();

      const res = await app.request('/api/notifications/mention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-notify',
          commentId: 'comment-2',
          authorId: 'author-user',
          content: 'セルフメンション',
          mentionedUserIds: ['author-user'],
          projectType: 'MONO',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sent).toBe(0);
    });

    it('FCMトークンがないユーザーは通知対象にならない', async () => {
      await seedNotificationData();

      const res = await app.request('/api/notifications/mention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-notify',
          commentId: 'comment-3',
          authorId: 'author-user',
          content: 'トークンなしテスト',
          mentionedUserIds: ['no-token-user'],
          projectType: 'MONO',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sent).toBe(0);
    });

    it('HTMLタグが除去されたプレビューが生成される', async () => {
      await seedNotificationData();

      const res = await app.request('/api/notifications/mention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-notify',
          commentId: 'comment-4',
          authorId: 'author-user',
          content: '<p><strong>太字</strong> &amp; <em>斜体</em></p>',
          mentionedUserIds: ['mentioned-user'],
          projectType: 'MONO',
        }),
      });

      const body = await res.json();
      expect(body.notification.body).toContain('太字 & 斜体');
      expect(body.notification.body).not.toContain('<');
    });
  });
});
