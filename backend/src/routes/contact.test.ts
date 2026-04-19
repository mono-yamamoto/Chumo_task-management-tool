import { describe, it, expect, afterAll, afterEach, beforeEach } from 'vitest';
import { createTestApp, db, client } from './test-app';
import { cleanDatabase } from '../db/test-helpers';
import * as schema from '../db/schema';

const app = createTestApp();

beforeEach(async () => {
  // adminユーザーとmemberユーザーを作成
  await db.insert(schema.users).values([
    {
      id: 'admin-user',
      email: 'admin@example.com',
      displayName: 'Admin',
      role: 'admin',
      isAllowed: true,
    },
    {
      id: 'test-user',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'member',
      isAllowed: true,
    },
  ]);
});

afterEach(async () => {
  await cleanDatabase(db);
});

afterAll(async () => {
  await client.end();
});

describe('Contact API', () => {
  describe('GET /api/contact', () => {
    it('pending一覧を取得できる', async () => {
      await db.insert(schema.contacts).values({
        id: 'contact-1',
        type: 'feature',
        title: '要望1',
        content: '内容',
        userId: 'test-user',
        userName: 'Test User',
        userEmail: 'test@example.com',
        status: 'pending',
      });

      const res = await app.request('/api/contact?status=pending');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.contacts).toHaveLength(1);
      expect(body.contacts[0].title).toBe('要望1');
    });

    it('resolved一覧を取得できる', async () => {
      await db.insert(schema.contacts).values([
        {
          id: 'c-pending',
          type: 'feature',
          title: 'Pending',
          content: '',
          userId: 'test-user',
          userName: 'Test',
          userEmail: 'test@example.com',
          status: 'pending',
        },
        {
          id: 'c-resolved',
          type: 'feature',
          title: 'Resolved',
          content: '',
          userId: 'test-user',
          userName: 'Test',
          userEmail: 'test@example.com',
          status: 'resolved',
        },
      ]);

      const res = await app.request('/api/contact?status=resolved');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.contacts).toHaveLength(1);
      expect(body.contacts[0].title).toBe('Resolved');
    });

    it('status未指定で400を返す', async () => {
      const res = await app.request('/api/contact');
      expect(res.status).toBe(400);
    });

    it('不正なstatusで400を返す', async () => {
      const res = await app.request('/api/contact?status=invalid');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/contact', () => {
    it('featureタイプのお問い合わせを作成できる（GITHUB_TOKEN未設定→warning付き201）', async () => {
      const res = await app.request('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feature',
          title: '新機能要望',
          content: '詳細な説明',
          userName: 'Test User',
          userEmail: 'test@example.com',
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.id).toBeDefined();
      expect(body.warning).toBe('GitHub token not configured');
    });

    it('errorタイプのお問い合わせをerrorReportDetails付きで作成できる', async () => {
      const res = await app.request('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error',
          title: 'エラー報告',
          userName: 'Test User',
          userEmail: 'test@example.com',
          errorReportDetails: {
            issue: 'ボタンが反応しない',
            reproductionSteps: '1. ログイン 2. ボタンクリック',
            environment: {
              device: 'PC',
              os: 'macOS',
              browser: 'Chrome',
              browserVersion: '120.0',
            },
          },
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.id).toBeDefined();
    });

    it('featureタイプでcontent未指定は400を返す', async () => {
      const res = await app.request('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feature',
          title: '要望',
          userName: 'Test User',
          userEmail: 'test@example.com',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/contact/:id', () => {
    beforeEach(async () => {
      await db.insert(schema.contacts).values({
        id: 'contact-update',
        type: 'feature',
        title: '更新テスト',
        content: '内容',
        userId: 'test-user',
        userName: 'Test User',
        userEmail: 'test@example.com',
        status: 'pending',
      });
    });

    it('adminがステータスを更新できる', async () => {
      const adminApp = createTestApp('admin-user');
      const res = await adminApp.request('/api/contact/contact-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
    });

    it('非adminは403を返す', async () => {
      const res = await app.request('/api/contact/contact-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });

      expect(res.status).toBe(403);
    });

    it('存在しないお問い合わせは404を返す', async () => {
      const adminApp = createTestApp('admin-user');
      const res = await adminApp.request('/api/contact/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });

      expect(res.status).toBe(404);
    });
  });
});
