import { describe, it, expect, afterAll, afterEach, beforeEach } from 'vitest';
import { createTestApp, db, client } from './test-app';
import { cleanDatabase } from '../db/test-helpers';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

const app = createTestApp();

beforeEach(async () => {
  await db.insert(schema.users).values({
    id: 'test-user',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'member',
    isAllowed: true,
    avatarColor: '#008B8A',
  });
});

afterEach(async () => {
  await cleanDatabase(db);
});

afterAll(async () => {
  await client.end();
});

describe('Users API', () => {
  describe('GET /api/users', () => {
    it('ユーザー一覧を取得できる', async () => {
      const res = await app.request('/api/users');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.users).toHaveLength(1);
      expect(body.users[0].displayName).toBe('Test User');
    });

    it('機密情報（googleRefreshToken等）が含まれない', async () => {
      // googleRefreshTokenを設定
      await db
        .update(schema.users)
        .set({ googleRefreshToken: 'secret-token-123' })
        .where(eq(schema.users.id, 'test-user'));

      const res = await app.request('/api/users');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.users[0]).not.toHaveProperty('googleRefreshToken');
      expect(body.users[0]).not.toHaveProperty('fcmTokens');
    });
  });

  describe('GET /api/users/me', () => {
    it('自分の情報を取得できる', async () => {
      const res = await app.request('/api/users/me');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.user.id).toBe('test-user');
      expect(body.user.email).toBe('test@example.com');
    });

    it('存在しないユーザーは404を返す', async () => {
      const otherApp = createTestApp('nonexistent-user');
      const res = await otherApp.request('/api/users/me');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/users/:id', () => {
    it('指定ユーザーを取得できる', async () => {
      const res = await app.request('/api/users/test-user');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.user.displayName).toBe('Test User');
    });

    it('存在しないユーザーは404を返す', async () => {
      const res = await app.request('/api/users/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('自分のdisplayNameとavatarColorを更新できる', async () => {
      const res = await app.request('/api/users/test-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: '更新太郎', avatarColor: '#FF5722' }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.user.displayName).toBe('更新太郎');
      expect(body.user.avatarColor).toBe('#FF5722');
    });

    it('自分のisAllowed/roleは更新されない（無視される）', async () => {
      const res = await app.request('/api/users/test-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Updated', isAllowed: false, role: 'admin' }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      // displayNameは更新される
      expect(body.user.displayName).toBe('Updated');
      // isAllowed/roleは元のまま（自己更新パスではこれらのフィールドは無視）
      expect(body.user.isAllowed).toBe(true);
      expect(body.user.role).toBe('member');
    });

    it('adminは他ユーザーのisAllowed/roleを更新できる', async () => {
      // adminユーザーを作成
      await db.insert(schema.users).values({
        id: 'admin-user',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'admin',
        isAllowed: true,
      });

      const adminApp = createTestApp('admin-user');
      const res = await adminApp.request('/api/users/test-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAllowed: false, role: 'admin' }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.user.isAllowed).toBe(false);
      expect(body.user.role).toBe('admin');
    });

    it('非adminが他ユーザーを更新しようとすると403', async () => {
      await db.insert(schema.users).values({
        id: 'other-user',
        email: 'other@example.com',
        displayName: 'Other',
        role: 'member',
        isAllowed: true,
      });

      const res = await app.request('/api/users/other-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAllowed: false }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/users/me/fcm-tokens', () => {
    it('FCMトークンを追加できる', async () => {
      const res = await app.request('/api/users/me/fcm-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'fcm-token-abc' }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);

      // DBで確認
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, 'test-user'));
      expect(user.fcmTokens).toContain('fcm-token-abc');
    });
  });

  describe('DELETE /api/users/me/fcm-tokens', () => {
    it('FCMトークンを削除できる', async () => {
      // まず追加
      await app.request('/api/users/me/fcm-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'fcm-token-del' }),
      });

      // 削除
      const res = await app.request('/api/users/me/fcm-tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'fcm-token-del' }),
      });

      expect(res.status).toBe(200);

      // DBで確認
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, 'test-user'));
      expect(user.fcmTokens).not.toContain('fcm-token-del');
    });
  });
});
