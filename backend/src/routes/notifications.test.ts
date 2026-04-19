import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
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

async function seedNotificationData() {
  await db.insert(schema.users).values([
    {
      id: 'test-user',
      email: 'test@test.com',
      displayName: 'テストユーザー',
      role: 'member',
      isAllowed: true,
    },
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
  ]);

  await db.insert(schema.tasks).values({
    id: 'task-notify',
    projectType: 'MONO',
    title: '通知テスト用タスク',
    kubunLabelId: 'label-1',
    assigneeIds: ['test-user', 'mentioned-user', 'author-user'],
    order: 1,
    createdBy: 'author-user',
  });
}

describe('Notifications API', () => {
  describe('POST /api/notifications/mention', () => {
    it('メンション通知レコードが作成される', async () => {
      await seedNotificationData();

      const res = await app.request('/api/notifications/mention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-notify',
          commentId: 'comment-1',
          content: '<p>テストコメント</p>',
          mentionedUserIds: ['mentioned-user'],
          projectType: 'MONO',
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.sent).toBe(1);

      const notifications = await db.select().from(schema.notifications);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]!.recipientId).toBe('mentioned-user');
      expect(notifications[0]!.type).toBe('mention');
      expect(notifications[0]!.title).toContain('テストユーザー');
      expect(notifications[0]!.body).toContain('通知テスト用タスク');
      expect(notifications[0]!.body).toContain('テストコメント');
    });

    it('自分自身へのメンションは除外される', async () => {
      await seedNotificationData();

      const res = await app.request('/api/notifications/mention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-notify',
          commentId: 'comment-2',
          content: 'セルフメンション',
          mentionedUserIds: ['test-user'],
          projectType: 'MONO',
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
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
          content: '<p><strong>太字</strong> &amp; <em>斜体</em></p>',
          mentionedUserIds: ['mentioned-user'],
          projectType: 'MONO',
        }),
      });

      const body = (await res.json()) as any;
      expect(body.sent).toBe(1);

      const notifications = await db.select().from(schema.notifications);
      expect(notifications[0]!.body).toContain('太字 & 斜体');
      expect(notifications[0]!.body).not.toContain('<');
    });
  });

  describe('GET /api/notifications', () => {
    it('自分の通知一覧が取得できる', async () => {
      await seedNotificationData();

      await db.insert(schema.notifications).values([
        {
          id: 'notif-1',
          recipientId: 'test-user',
          type: 'mention',
          title: 'テスト通知',
          body: 'テスト本文',
          taskId: 'task-notify',
          actorId: 'author-user',
          isRead: false,
        },
        {
          id: 'notif-2',
          recipientId: 'test-user',
          type: 'session_reminder',
          title: 'セッション未記録',
          body: 'タスクのセッションが未記録です',
          taskId: 'task-notify',
          actorId: 'author-user',
          isRead: true,
        },
        {
          id: 'notif-other',
          recipientId: 'author-user',
          type: 'mention',
          title: '他人の通知',
          body: '他人向け',
          taskId: 'task-notify',
          actorId: 'test-user',
        },
      ]);

      const res = await app.request('/api/notifications');

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.notifications).toHaveLength(2);
      expect(body.hasMore).toBe(false);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('未読通知件数が取得できる', async () => {
      await seedNotificationData();

      await db.insert(schema.notifications).values([
        {
          id: 'notif-unread-1',
          recipientId: 'test-user',
          type: 'mention',
          title: '未読1',
          body: '未読',
          taskId: 'task-notify',
          actorId: 'author-user',
          isRead: false,
        },
        {
          id: 'notif-unread-2',
          recipientId: 'test-user',
          type: 'mention',
          title: '未読2',
          body: '未読',
          taskId: 'task-notify',
          actorId: 'author-user',
          isRead: false,
        },
        {
          id: 'notif-read',
          recipientId: 'test-user',
          type: 'mention',
          title: '既読',
          body: '既読',
          taskId: 'task-notify',
          actorId: 'author-user',
          isRead: true,
        },
      ]);

      const res = await app.request('/api/notifications/unread-count');

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.count).toBe(2);
    });
  });

  describe('POST /api/notifications/mark-read', () => {
    it('個別の通知を既読にできる', async () => {
      await seedNotificationData();

      await db.insert(schema.notifications).values({
        id: 'notif-to-read',
        recipientId: 'test-user',
        type: 'mention',
        title: 'テスト',
        body: 'テスト',
        taskId: 'task-notify',
        actorId: 'author-user',
        isRead: false,
      });

      const res = await app.request('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ['notif-to-read'] }),
      });

      expect(res.status).toBe(200);

      const [notif] = await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.id, 'notif-to-read'));
      expect(notif!.isRead).toBe(true);
    });

    it('全通知を一括既読にできる', async () => {
      await seedNotificationData();

      await db.insert(schema.notifications).values([
        {
          id: 'notif-a',
          recipientId: 'test-user',
          type: 'mention',
          title: 'A',
          body: 'A',
          taskId: 'task-notify',
          actorId: 'author-user',
          isRead: false,
        },
        {
          id: 'notif-b',
          recipientId: 'test-user',
          type: 'mention',
          title: 'B',
          body: 'B',
          taskId: 'task-notify',
          actorId: 'author-user',
          isRead: false,
        },
      ]);

      const res = await app.request('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });

      expect(res.status).toBe(200);

      const notifications = await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.recipientId, 'test-user'));
      expect(notifications.every((n) => n.isRead)).toBe(true);
    });
  });

  describe('POST /api/notifications/session-reminder', () => {
    it('セッション未記録通知が送信される', async () => {
      await seedNotificationData();

      const res = await app.request('/api/notifications/session-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-notify',
          targetUserIds: ['mentioned-user', 'author-user'],
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.sentCount).toBe(2);

      // DBに通知レコードが保存されたか確認
      const notifications = await db.select().from(schema.notifications);
      expect(notifications).toHaveLength(2);
      expect(notifications.every((n) => n.type === 'session_reminder')).toBe(true);

      // タスクの sessionReminders が更新されたか確認
      const [task] = await db
        .select({ sessionReminders: schema.tasks.sessionReminders })
        .from(schema.tasks)
        .where(eq(schema.tasks.id, 'task-notify'));
      const reminders = task!.sessionReminders as Record<string, any>;
      expect(reminders['mentioned-user']).toBeDefined();
      expect(reminders['mentioned-user'].sentBy).toBe('test-user');
      expect(reminders['author-user']).toBeDefined();
    });

    it('対象ユーザーがタスクのアサイニーでない場合は400を返す', async () => {
      await seedNotificationData();

      const res = await app.request('/api/notifications/session-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-notify',
          targetUserIds: ['mentioned-user', 'non-assignee-user'],
        }),
      });

      expect(res.status).toBe(400);

      // 通知レコードも sessionReminders も更新されていないこと
      const notifications = await db.select().from(schema.notifications);
      expect(notifications).toHaveLength(0);
      const [task] = await db
        .select({ sessionReminders: schema.tasks.sessionReminders })
        .from(schema.tasks)
        .where(eq(schema.tasks.id, 'task-notify'));
      expect(task!.sessionReminders).toBeNull();
    });
  });
});
