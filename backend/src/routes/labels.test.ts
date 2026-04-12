import { describe, it, expect, afterAll, afterEach, beforeEach } from 'vitest';
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

describe('Labels API', () => {
  describe('GET /api/labels', () => {
    beforeEach(async () => {
      await db.insert(schema.users).values({
        id: 'test-user',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'member',
      });

      await db.insert(schema.labels).values([
        { id: 'label-global-1', name: '運用', color: '#008B8A', ownerId: 'test-user' },
        { id: 'label-global-2', name: '開発', color: '#2196F3', ownerId: 'test-user' },
        {
          id: 'label-proj-1',
          name: 'プロジェクトラベル',
          color: '#FF5722',
          ownerId: 'test-user',
          projectId: 'proj-1',
        },
        {
          id: 'label-proj-2',
          name: '別プロジェクト',
          color: '#4CAF50',
          ownerId: 'test-user',
          projectId: 'proj-2',
        },
      ]);
    });

    it('projectId未指定でグローバルラベルのみ返す', async () => {
      const res = await app.request('/api/labels');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.labels).toHaveLength(2);
      expect(body.labels.every((l: any) => l.projectId === null)).toBe(true);
    });

    it('projectId指定でプロジェクト+グローバルラベルを返す', async () => {
      const res = await app.request('/api/labels?projectId=proj-1');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.labels).toHaveLength(3);
      const names = body.labels.map((l: any) => l.name);
      expect(names).toContain('運用');
      expect(names).toContain('開発');
      expect(names).toContain('プロジェクトラベル');
      expect(names).not.toContain('別プロジェクト');
    });

    it('ラベルなしで空配列を返す', async () => {
      // beforeEachで投入したデータをクリアして空状態をテスト
      await db.delete(schema.labels);
      const res = await app.request('/api/labels');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.labels).toHaveLength(0);
    });
  });
});
