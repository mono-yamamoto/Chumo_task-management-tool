import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestApp, db, client, TEST_ENV } from './test-app';
import { cleanDatabase } from '../db/test-helpers';
import * as schema from '../db/schema';

const app = createTestApp();

const postWebhook = (payload: unknown) =>
  app.request('/api/backlog/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Backlog-Webhook-Secret': TEST_ENV.BACKLOG_WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
  });

afterEach(async () => {
  await cleanDatabase(db);
});

afterAll(async () => {
  await client.end();
});

describe('Backlog API', () => {
  describe('POST /api/backlog/webhook', () => {
    it('新規タスクを作成できる（content形式）', async () => {
      const res = await postWebhook({
        project: { projectKey: 'BRGREG' },
        content: {
          id: 2905,
          key_id: 2905,
          summary: 'テストタスク',
          description: '説明文',
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.projectType).toBe('BRGREG');
      expect(body.issueKey).toBe('BRGREG-2905');
      expect(body.taskId).toBeDefined();

      // DBに保存されたことを確認
      const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, body.taskId));
      expect(task.title).toBe('BRGREG-2905 テストタスク');
      expect(task.projectType).toBe('BRGREG');

      // external情報も確認
      const [ext] = await db
        .select()
        .from(schema.taskExternals)
        .where(eq(schema.taskExternals.taskId, body.taskId));
      expect(ext.issueKey).toBe('BRGREG-2905');
      expect(ext.source).toBe('backlog');
    });

    it('既存タスクを更新できる（idempotent upsert）', async () => {
      // 1回目: 作成
      const res1 = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: { id: 100, key_id: 100, summary: '初回タイトル' },
      });
      expect(res1.status).toBe(200);
      const body1 = (await res1.json()) as any;

      // 2回目: 更新
      const res2 = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: { id: 100, key_id: 100, summary: '更新タイトル' },
      });
      expect(res2.status).toBe(200);
      const body2 = (await res2.json()) as any;
      expect(body2.updated).toBe(true);
      expect(body2.taskId).toBe(body1.taskId);

      // タイトルが更新されている
      const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, body1.taskId));
      expect(task.title).toBe('REG2017-100 更新タイトル');
    });

    it('issueKeyがないと400', async () => {
      const res = await postWebhook({ content: { summary: 'テスト' } });
      expect(res.status).toBe(400);
    });

    it('不明なプロジェクトタイプだと400', async () => {
      const res = await postWebhook({
        project: { projectKey: 'UNKNOWN' },
        content: { id: 1, key_id: 1, summary: 'テスト' },
      });
      expect(res.status).toBe(400);
    });

    it('titleがないと400', async () => {
      const res = await postWebhook({
        project: { projectKey: 'MONO' },
        content: { id: 1, key_id: 1 },
      });
      expect(res.status).toBe(400);
    });

    it('issue形式のペイロードでも処理できる', async () => {
      const res = await postWebhook({
        issue: {
          id: 500,
          issueKey: 'MONO-500',
          summary: 'issue形式タスク',
        },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.projectType).toBe('MONO');
    });

    it('カスタムフィールドから日付を抽出できる（実ペイロード形式）', async () => {
      const res = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: {
          id: 200,
          key_id: 200,
          summary: '日付テスト',
          customFields: [
            { id: 25, fieldTypeId: 4, name: 'ＩＴ予定日', value: '2026-07-15T00:00:00Z' },
            { id: 30, fieldTypeId: 4, name: '本番リリース予定日', value: '2026-07-31T00:00:00Z' },
          ],
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;

      const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, body.taskId));
      expect(task.itUpDate).not.toBeNull();
      expect(task.releaseDate).not.toBeNull();
    });

    it('設定IDと不一致でも属性名で日付を抽出できる（ID振り直し耐性）', async () => {
      const res = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: {
          id: 201,
          key_id: 201,
          summary: 'IDずれテスト',
          customFields: [
            { id: 12345, fieldTypeId: 4, name: 'ＩＴ予定日', value: '2026-07-15T00:00:00Z' },
          ],
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;

      const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, body.taskId));
      expect(task.itUpDate).not.toBeNull();
      expect(task.releaseDate).toBeNull();
    });

    it('更新イベント（customFieldsなし）でも既存の日付を消さない', async () => {
      // 作成: 日付あり
      const res1 = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: {
          id: 300,
          key_id: 300,
          summary: '日付保持テスト',
          customFields: [
            { id: 25, fieldTypeId: 4, name: 'ＩＴ予定日', value: '2026/07/15' },
            { id: 30, fieldTypeId: 4, name: '本番リリース予定日', value: '2026/08/01' },
          ],
        },
      });
      const body1 = (await res1.json()) as any;

      // 更新イベント: customFieldsなし・日付以外の変更のみ
      const res2 = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: {
          id: 300,
          key_id: 300,
          summary: '日付保持テスト（更新後）',
          changes: [
            { field: 'status', new_value: '処理中', old_value: '未対応', type: 'standard' },
          ],
        },
      });
      expect(res2.status).toBe(200);

      const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, body1.taskId));
      expect(task.title).toBe('REG2017-300 日付保持テスト（更新後）');
      expect(task.itUpDate).not.toBeNull();
      expect(task.releaseDate).not.toBeNull();
    });

    it('更新イベントのchangesから日付を反映できる', async () => {
      // 作成: 日付なし
      const res1 = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: { id: 301, key_id: 301, summary: '日付追加テスト' },
      });
      const body1 = (await res1.json()) as any;

      // 更新イベント: changesでＩＴ予定日・本番リリース予定日を設定
      const res2 = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: {
          id: 301,
          key_id: 301,
          summary: '日付追加テスト',
          changes: [
            { field: 'ＩＴ予定日', new_value: '2026/07/22', old_value: '', type: 'custom' },
            {
              field: '本番リリース予定日',
              new_value: '2026/07/30',
              old_value: '',
              type: 'custom',
            },
          ],
        },
      });
      expect(res2.status).toBe(200);

      const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, body1.taskId));
      expect(task.itUpDate).not.toBeNull();
      expect(task.releaseDate).not.toBeNull();
    });

    it('更新イベントのchanges（customField_<ID>形式）でも日付を反映できる', async () => {
      const res1 = await postWebhook({
        project: { projectKey: 'BRGREG' },
        content: { id: 302, key_id: 302, summary: 'ID形式テスト' },
      });
      const body1 = (await res1.json()) as any;

      const res2 = await postWebhook({
        project: { projectKey: 'BRGREG' },
        content: {
          id: 302,
          key_id: 302,
          summary: 'ID形式テスト',
          changes: [
            {
              field: 'customField_4',
              new_value: '2026/07/22',
              old_value: '',
              type: 'custom',
            },
          ],
        },
      });
      expect(res2.status).toBe(200);

      const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, body1.taskId));
      expect(task.itUpDate).not.toBeNull();
      // 変更が無かった releaseDate は触らない
      expect(task.releaseDate).toBeNull();
    });

    it('外部連携なしの手動作成タスクに複製を作らずリンクして更新する', async () => {
      // 手動作成タスク（task_externals なし・日付は手入力済み）
      const manualTaskId = 'manual-task-00000001';
      await db.insert(schema.tasks).values({
        id: manualTaskId,
        projectType: 'REG2017',
        title: 'REG2017-900 手動作成タスク',
        flowStatus: '対応中',
        assigneeIds: [],
        itUpDate: new Date('2026-07-13'),
        releaseDate: new Date('2026-07-31'),
        kubunLabelId: '',
        order: 1,
        createdBy: 'user_test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 同じ課題番号の更新イベント（日付情報なし）
      const res = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: {
          id: 900,
          key_id: 900,
          summary: '手動作成タスク（Backlog側タイトル）',
          changes: [
            { field: 'assigner', new_value: 'user2', old_value: 'user1', type: 'standard' },
          ],
        },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;

      // 複製されず手動タスクにリンクされる
      expect(body.taskId).toBe(manualTaskId);
      expect(body.updated).toBe(true);
      expect(body.linked).toBe(true);

      const allTasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.projectType, 'REG2017'));
      expect(allTasks).toHaveLength(1);

      // 外部連携が作成され、手入力の日付は保持される
      const [ext] = await db
        .select()
        .from(schema.taskExternals)
        .where(eq(schema.taskExternals.taskId, manualTaskId));
      expect(ext.issueKey).toBe('REG2017-900');
      const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, manualTaskId));
      expect(task.title).toBe('REG2017-900 手動作成タスク（Backlog側タイトル）');
      expect(task.itUpDate).not.toBeNull();
      expect(task.releaseDate).not.toBeNull();

      // 2回目のイベントでも同じタスクが更新される（冪等）
      const res2 = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: { id: 900, key_id: 900, summary: '再更新' },
      });
      const body2 = (await res2.json()) as any;
      expect(body2.taskId).toBe(manualTaskId);
      expect(body2.linked).toBeUndefined();
    });

    it('同一課題の同時配信でも500にならず片方のタスクに収束する', async () => {
      // 未リンクの手動作成タスク
      await db.insert(schema.tasks).values({
        id: 'manual-task-00000003',
        projectType: 'REG2017',
        title: 'REG2017-901 同時配信テスト',
        flowStatus: '対応中',
        assigneeIds: [],
        kubunLabelId: '',
        order: 1,
        createdBy: 'user_test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 同じイベントの重複配信を並行実行
      const payload = {
        project: { projectKey: 'REG2017' },
        content: { id: 901, key_id: 901, summary: '同時配信テスト' },
      };
      const [res1, res2] = await Promise.all([postWebhook(payload), postWebhook(payload)]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // タスクは増えず、リンクは1本だけ
      const allTasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.projectType, 'REG2017'));
      expect(allTasks).toHaveLength(1);
      const exts = await db
        .select()
        .from(schema.taskExternals)
        .where(eq(schema.taskExternals.issueKey, 'REG2017-901'));
      expect(exts).toHaveLength(1);
      expect(exts[0].taskId).toBe('manual-task-00000003');
    });

    it('課題番号が前方一致するだけの別タスクにはリンクしない', async () => {
      // REG2017-90 のタスク（REG2017-900 とは別課題）
      await db.insert(schema.tasks).values({
        id: 'manual-task-00000002',
        projectType: 'REG2017',
        title: 'REG2017-90 別のタスク',
        flowStatus: '対応中',
        assigneeIds: [],
        kubunLabelId: '',
        order: 1,
        createdBy: 'user_test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: { id: 900, key_id: 900, summary: '新規課題' },
      });
      const body = (await res.json()) as any;

      // リンクされず新規作成される
      expect(body.taskId).not.toBe('manual-task-00000002');
      expect(body.linked).toBeUndefined();
    });

    it('更新イベントで日付がクリアされたらnullにする', async () => {
      const res1 = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: {
          id: 303,
          key_id: 303,
          summary: '日付クリアテスト',
          customFields: [{ id: 25, fieldTypeId: 4, name: 'ＩＴ予定日', value: '2026/07/15' }],
        },
      });
      const body1 = (await res1.json()) as any;

      const res2 = await postWebhook({
        project: { projectKey: 'REG2017' },
        content: {
          id: 303,
          key_id: 303,
          summary: '日付クリアテスト',
          changes: [
            { field: 'ＩＴ予定日', new_value: '', old_value: '2026/07/15', type: 'custom' },
          ],
        },
      });
      expect(res2.status).toBe(200);

      const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, body1.taskId));
      expect(task.itUpDate).toBeNull();
    });
  });

  describe('POST /api/backlog/sync', () => {
    it('新規タスクを同期できる', async () => {
      const res = await app.request('/api/backlog/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Backlog-Webhook-Secret': TEST_ENV.BACKLOG_WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          issueKey: 'MONO-100',
          issueId: '100',
          url: 'https://ss-pj.jp/backlog/view/MONO-100',
          title: '同期タスク',
          projectType: 'MONO',
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
    });

    it('既存タスクの更新ができる', async () => {
      // 1回目
      await app.request('/api/backlog/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Backlog-Webhook-Secret': TEST_ENV.BACKLOG_WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          issueKey: 'MONO-200',
          issueId: '200',
          url: 'https://ss-pj.jp/backlog/view/MONO-200',
          title: '初回タイトル',
          projectType: 'MONO',
        }),
      });

      // 2回目（更新）
      const res2 = await app.request('/api/backlog/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Backlog-Webhook-Secret': TEST_ENV.BACKLOG_WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          issueKey: 'MONO-200',
          issueId: '200',
          url: 'https://ss-pj.jp/backlog/view/MONO-200',
          title: '更新タイトル',
          projectType: 'MONO',
        }),
      });

      expect(res2.status).toBe(200);
    });

    it('必須フィールド不足で400', async () => {
      const res = await app.request('/api/backlog/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Backlog-Webhook-Secret': TEST_ENV.BACKLOG_WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          issueKey: 'MONO-100',
        }),
      });
      expect(res.status).toBe(400);
    });
  });
});
