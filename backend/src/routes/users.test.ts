import { describe, it, expect, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { createClerkClient } from '@clerk/backend';
import { createTestApp, db, client } from './test-app';
import { cleanDatabase } from '../db/test-helpers';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

// Clerk SDK 全体をモック化。
// /me の Clerk fallback は getUser が reject されれば 404 に落ちるだけなので既存テストに無害。
// /invite 系は各テスト内で createInvitation の挙動を上書きする。
vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn(),
}));

const mockedCreateClerkClient = vi.mocked(createClerkClient);

function setClerkMock(overrides: {
  createInvitation?: ReturnType<typeof vi.fn>;
  getUser?: ReturnType<typeof vi.fn>;
}) {
  mockedCreateClerkClient.mockReturnValue({
    invitations: {
      createInvitation: overrides.createInvitation ?? vi.fn().mockResolvedValue({ id: 'inv_mock' }),
    },
    users: {
      getUser: overrides.getUser ?? vi.fn().mockRejectedValue(new Error('clerk mock not set')),
    },
  } as unknown as ReturnType<typeof createClerkClient>);
}

const app = createTestApp();

beforeEach(async () => {
  // 各テストの先頭で Clerk モックをデフォルト状態にリセット
  setClerkMock({});

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

  describe('POST /api/users/invite', () => {
    it('管理者以外は403', async () => {
      const res = await app.request('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com', role: 'member' }),
      });

      expect(res.status).toBe(403);
    });

    it('既存の有効なメールは409', async () => {
      await db.insert(schema.users).values({
        id: 'admin-user',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'admin',
        isAllowed: true,
      });
      const adminApp = createTestApp('admin-user');

      const res = await adminApp.request('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', role: 'member' }),
      });

      expect(res.status).toBe(409);
    });

    it('無効化されたユーザーは再有効化される', async () => {
      await db.insert(schema.users).values({
        id: 'admin-user',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'admin',
        isAllowed: true,
      });
      await db.insert(schema.users).values({
        id: 'disabled-user',
        email: 'disabled@example.com',
        displayName: 'Disabled',
        role: 'member',
        isAllowed: false,
      });
      const adminApp = createTestApp('admin-user');

      const res = await adminApp.request('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'disabled@example.com', role: 'admin' }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.restored).toBe(true);

      const [restored] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, 'disabled-user'));
      expect(restored.isAllowed).toBe(true);
      expect(restored.role).toBe('admin');
    });

    it('APP_ORIGIN 未設定なら 500 で明示メッセージを返す', async () => {
      await db.insert(schema.users).values({
        id: 'admin-user',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'admin',
        isAllowed: true,
      });
      const adminApp = createTestApp('admin-user');

      // APP_ORIGIN が空のままリクエスト
      const res = await adminApp.request('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com', role: 'member' }),
      });

      expect(res.status).toBe(500);
      const body = (await res.json()) as any;
      expect(String(body.error)).toContain('APP_ORIGIN');

      // 早期 return なので DB にプレースホルダーは作られない
      const [shouldNotExist] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'new@example.com'));
      expect(shouldNotExist).toBeUndefined();
    });

    it('APP_ORIGIN が URL 形式不正なら 500 を返す', async () => {
      await db.insert(schema.users).values({
        id: 'admin-user',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'admin',
        isAllowed: true,
      });
      const adminApp = createTestApp('admin-user');

      const res = await adminApp.request(
        '/api/users/invite',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'new@example.com', role: 'member' }),
        },
        { APP_ORIGIN: 'localhost:3000' }
      );

      expect(res.status).toBe(500);
      const body = (await res.json()) as any;
      expect(String(body.error)).toContain('APP_ORIGIN');
    });

    it('Clerk が 4xx を返したら 400 で詳細メッセージを返す', async () => {
      await db.insert(schema.users).values({
        id: 'admin-user',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'admin',
        isAllowed: true,
      });
      const adminApp = createTestApp('admin-user');

      const clerkErr = {
        status: 422,
        errors: [
          {
            long_message: 'redirect_url is not allowed for this instance',
            code: 'redirect_url_not_allowed',
          },
        ],
      };
      setClerkMock({
        createInvitation: vi.fn().mockRejectedValue(clerkErr),
      });

      const res = await adminApp.request(
        '/api/users/invite',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'new@example.com', role: 'member' }),
        },
        { APP_ORIGIN: 'https://example.com' }
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.error).toContain('redirect_url is not allowed');

      // DB プレースホルダーは補償削除されている
      const [shouldNotExist] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'new@example.com'));
      expect(shouldNotExist).toBeUndefined();
    });

    it('Clerk が 5xx / 例外なら 500 で汎用メッセージを返し内部エラーを露出しない', async () => {
      await db.insert(schema.users).values({
        id: 'admin-user',
        email: 'admin@example.com',
        displayName: 'Admin',
        role: 'admin',
        isAllowed: true,
      });
      const adminApp = createTestApp('admin-user');

      setClerkMock({
        createInvitation: vi
          .fn()
          .mockRejectedValue(new Error('Internal Clerk error: secret_leak_xyz')),
      });

      const res = await adminApp.request(
        '/api/users/invite',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'new@example.com', role: 'member' }),
        },
        { APP_ORIGIN: 'https://example.com' }
      );

      expect(res.status).toBe(500);
      const body = (await res.json()) as any;
      // 内部メッセージは漏らさない
      expect(body.error).not.toContain('secret_leak_xyz');
      // 汎用メッセージは返す
      expect(body.error).toContain('招待の送信に失敗');

      // 補償削除されている
      const [shouldNotExist] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, 'new@example.com'));
      expect(shouldNotExist).toBeUndefined();
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
