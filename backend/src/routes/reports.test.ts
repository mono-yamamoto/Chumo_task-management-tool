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

/**
 * レポートのテストデータをシードする
 * 「運用」ラベル + 複数プロジェクトタイプのタスク + セッション
 */
async function seedReportData() {
  // 「運用」区分ラベル
  await db.insert(schema.labels).values({
    id: 'kubun-unyo',
    name: '運用',
    color: '#00897B',
    projectId: null,
    ownerId: 'test-user',
  });

  // 「開発」区分ラベル（レポート対象外）
  await db.insert(schema.labels).values({
    id: 'kubun-kaihatsu',
    name: '開発',
    color: '#1E88E5',
    projectId: null,
    ownerId: 'test-user',
  });

  // タスク: MONO + 運用（レポート対象 normal）
  await db.insert(schema.tasks).values({
    id: 'task-mono-1',
    projectType: 'MONO',
    title: 'MONOタスク1',
    kubunLabelId: 'kubun-unyo',
    order: 1,
    createdBy: 'test-user',
  });

  // タスク: BRGREG + 運用（レポート対象 brg）
  await db.insert(schema.tasks).values({
    id: 'task-brg-1',
    projectType: 'BRGREG',
    title: 'BRGREGタスク1',
    kubunLabelId: 'kubun-unyo',
    order: 1,
    createdBy: 'test-user',
  });

  // タスク: FAQ_IMP + 運用（レポート対象 faq_imp、normalからは除外される）
  await db.insert(schema.tasks).values({
    id: 'task-faq-unyo',
    projectType: 'FAQ_IMP',
    title: 'FAQ_IMP運用タスク',
    kubunLabelId: 'kubun-unyo',
    order: 1,
    createdBy: 'test-user',
  });

  // タスク: FAQ_IMP + 開発（区分不問で faq_imp に含まれることの検証用）
  await db.insert(schema.tasks).values({
    id: 'task-faq-dev',
    projectType: 'FAQ_IMP',
    title: 'FAQ_IMP開発タスク',
    kubunLabelId: 'kubun-kaihatsu',
    order: 2,
    createdBy: 'test-user',
  });

  // タスク: MONO + 開発（レポート対象外）
  await db.insert(schema.tasks).values({
    id: 'task-mono-dev',
    projectType: 'MONO',
    title: 'MONO開発タスク',
    kubunLabelId: 'kubun-kaihatsu',
    order: 2,
    createdBy: 'test-user',
  });

  // タスク: MONO + 運用 + over3Reason付き
  await db.insert(schema.tasks).values({
    id: 'task-mono-over3',
    projectType: 'MONO',
    title: 'MONO長時間タスク',
    kubunLabelId: 'kubun-unyo',
    over3Reason: '仕様変更のため',
    order: 3,
    createdBy: 'test-user',
  });

  const baseDate = new Date('2025-06-15T10:00:00Z');

  // セッション: task-mono-1 に 1時間（3600秒）
  await db.insert(schema.taskSessions).values({
    id: 'session-1',
    taskId: 'task-mono-1',
    projectType: 'MONO',
    userId: 'test-user',
    startedAt: new Date(baseDate.getTime()),
    endedAt: new Date(baseDate.getTime() + 3600 * 1000),
    durationSec: 3600,
  });

  // セッション: task-mono-1 に追加30分（1800秒）
  await db.insert(schema.taskSessions).values({
    id: 'session-2',
    taskId: 'task-mono-1',
    projectType: 'MONO',
    userId: 'test-user',
    startedAt: new Date(baseDate.getTime() + 7200 * 1000),
    endedAt: new Date(baseDate.getTime() + 9000 * 1000),
    durationSec: 1800,
  });

  // セッション: task-brg-1 に 2時間（7200秒）
  await db.insert(schema.taskSessions).values({
    id: 'session-3',
    taskId: 'task-brg-1',
    projectType: 'BRGREG',
    userId: 'test-user',
    startedAt: new Date(baseDate.getTime()),
    endedAt: new Date(baseDate.getTime() + 7200 * 1000),
    durationSec: 7200,
  });

  // セッション: task-mono-dev に 1時間（レポート対象外 = 開発区分）
  await db.insert(schema.taskSessions).values({
    id: 'session-4',
    taskId: 'task-mono-dev',
    projectType: 'MONO',
    userId: 'test-user',
    startedAt: new Date(baseDate.getTime()),
    endedAt: new Date(baseDate.getTime() + 3600 * 1000),
    durationSec: 3600,
  });

  // セッション: task-mono-over3 に 4時間（14400秒 → over3hours発動）
  await db.insert(schema.taskSessions).values({
    id: 'session-5',
    taskId: 'task-mono-over3',
    projectType: 'MONO',
    userId: 'test-user',
    startedAt: new Date(baseDate.getTime()),
    endedAt: new Date(baseDate.getTime() + 14400 * 1000),
    durationSec: 14400,
  });

  // セッション: task-faq-unyo に 30分（1800秒）
  await db.insert(schema.taskSessions).values({
    id: 'session-faq-1',
    taskId: 'task-faq-unyo',
    projectType: 'FAQ_IMP',
    userId: 'test-user',
    startedAt: new Date(baseDate.getTime()),
    endedAt: new Date(baseDate.getTime() + 1800 * 1000),
    durationSec: 1800,
  });

  // セッション: task-faq-dev に 15分（900秒、区分=開発でも faq_imp に含まれる）
  await db.insert(schema.taskSessions).values({
    id: 'session-faq-2',
    taskId: 'task-faq-dev',
    projectType: 'FAQ_IMP',
    userId: 'test-user',
    startedAt: new Date(baseDate.getTime()),
    endedAt: new Date(baseDate.getTime() + 900 * 1000),
    durationSec: 900,
  });

  // セッション: 対象期間外（レポートに含まれない）
  await db.insert(schema.taskSessions).values({
    id: 'session-out-of-range',
    taskId: 'task-mono-1',
    projectType: 'MONO',
    userId: 'test-user',
    startedAt: new Date('2025-01-01T10:00:00Z'),
    endedAt: new Date('2025-01-01T11:00:00Z'),
    durationSec: 3600,
  });

  // セッション: endedAt=null（未完了、レポートに含まれない）
  await db.insert(schema.taskSessions).values({
    id: 'session-active',
    taskId: 'task-mono-1',
    projectType: 'MONO',
    userId: 'test-user',
    startedAt: new Date(baseDate.getTime()),
    endedAt: null,
    durationSec: 0,
  });
}

describe('Reports API', () => {
  describe('GET /api/reports/time', () => {
    it('normalタイプのレポートを取得できる', async () => {
      await seedReportData();

      const res = await app.request('/api/reports/time?from=2025-06-01&to=2025-06-30&type=normal');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      // normal = BRGREG以外 → task-mono-1(5400) + task-mono-over3(14400)
      expect(body.items).toHaveLength(2);
      expect(body.totalDurationSec).toBe(5400 + 14400);

      // task-mono-1: 3600 + 1800 = 5400秒
      const mono1 = body.items.find((i: { taskId: string }) => i.taskId === 'task-mono-1');
      expect(mono1).toBeDefined();
      expect(mono1.durationSec).toBe(5400);
      expect(mono1.over3hours).toBeUndefined(); // 3時間未満

      // task-mono-over3: 14400秒 → over3hours発動
      const over3 = body.items.find((i: { taskId: string }) => i.taskId === 'task-mono-over3');
      expect(over3).toBeDefined();
      expect(over3.durationSec).toBe(14400);
      expect(over3.over3hours).toBe('仕様変更のため');
    });

    it('brgタイプのレポートを取得できる', async () => {
      await seedReportData();

      const res = await app.request('/api/reports/time?from=2025-06-01&to=2025-06-30&type=brg');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      // brg = BRGREGのみ → task-brg-1(7200)
      expect(body.items).toHaveLength(1);
      expect(body.totalDurationSec).toBe(7200);
      expect(body.items[0].taskId).toBe('task-brg-1');
    });

    it('faq_impタイプは区分不問でFAQ_IMPの全タスクを集計する', async () => {
      await seedReportData();

      const res = await app.request('/api/reports/time?from=2025-06-01&to=2025-06-30&type=faq_imp');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      // faq_imp = FAQ_IMP全タスク（区分不問）→ task-faq-unyo(1800) + task-faq-dev(900)
      expect(body.items).toHaveLength(2);
      expect(body.totalDurationSec).toBe(1800 + 900);

      const taskIds = body.items.map((i: { taskId: string }) => i.taskId).sort();
      expect(taskIds).toEqual(['task-faq-dev', 'task-faq-unyo']);
    });

    it('normalタイプはFAQ_IMP（運用区分）を含まない', async () => {
      await seedReportData();

      const res = await app.request('/api/reports/time?from=2025-06-01&to=2025-06-30&type=normal');
      const body = (await res.json()) as any;

      const faqTask = body.items.find((i: { taskId: string }) => i.taskId === 'task-faq-unyo');
      expect(faqTask).toBeUndefined();
    });

    it('開発区分のタスクはレポートに含まれない', async () => {
      await seedReportData();

      const res = await app.request('/api/reports/time?from=2025-06-01&to=2025-06-30&type=normal');
      const body = (await res.json()) as any;

      const devTask = body.items.find((i: { taskId: string }) => i.taskId === 'task-mono-dev');
      expect(devTask).toBeUndefined();
    });

    it('日付範囲外のセッションはレポートに含まれない', async () => {
      await seedReportData();

      const res = await app.request('/api/reports/time?from=2025-06-01&to=2025-06-30&type=normal');
      const body = (await res.json()) as any;

      // task-mono-1のdurationSecは5400（範囲外の3600は含まれない）
      const mono1 = body.items.find((i: { taskId: string }) => i.taskId === 'task-mono-1');
      expect(mono1.durationSec).toBe(5400);
    });

    it('from/toが未指定だと400', async () => {
      const res = await app.request('/api/reports/time');
      expect(res.status).toBe(400);
    });

    it('不正な日付だと400', async () => {
      const res = await app.request('/api/reports/time?from=invalid&to=2025-06-30');
      expect(res.status).toBe(400);
    });

    it('「運用」ラベルがない場合は空結果を返す', async () => {
      // ラベルなしでリクエスト
      const res = await app.request('/api/reports/time?from=2025-06-01&to=2025-06-30&type=normal');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.items).toHaveLength(0);
      expect(body.totalDurationSec).toBe(0);
    });

    it('typeデフォルトはnormal', async () => {
      await seedReportData();

      const res = await app.request('/api/reports/time?from=2025-06-01&to=2025-06-30');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      // normalと同じ結果
      expect(body.items).toHaveLength(2);
    });
  });

  describe('GET /api/reports/time/csv', () => {
    it('CSVフォーマットでダウンロードできる', async () => {
      await seedReportData();

      const res = await app.request(
        '/api/reports/time/csv?from=2025-06-01&to=2025-06-30&type=normal'
      );
      expect(res.status).toBe(200);

      // Content-Type確認
      expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
      expect(res.headers.get('Content-Disposition')).toContain(
        'report_normal_2025-06-01_2025-06-30.csv'
      );

      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // BOM付きUTF-8: EF BB BF
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);

      const csv = new globalThis.TextDecoder('utf-8').decode(buf);
      // ヘッダー行
      const lines = csv.replace('\uFEFF', '').split('\r\n');
      expect(lines[0]).toBe('title,durationSec,over3hours');

      // データ行が2行（normal対象タスク2件）
      const dataLines = lines.slice(1).filter((l) => l.length > 0);
      expect(dataLines).toHaveLength(2);
    });

    it('over3hoursのCSVエスケープが正しい', async () => {
      await seedReportData();

      const res = await app.request(
        '/api/reports/time/csv?from=2025-06-01&to=2025-06-30&type=normal'
      );
      const csv = await res.text();
      const lines = csv.replace('\uFEFF', '').split('\r\n');

      // over3Reason付きのタスクが含まれる
      const over3Line = lines.find((l) => l.includes('長時間タスク'));
      expect(over3Line).toBeDefined();
      expect(over3Line).toContain('"仕様変更のため"');
    });

    it('from/toが未指定だと400', async () => {
      const res = await app.request('/api/reports/time/csv');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/reports/time/partners', () => {
    /**
     * パートナー稼働時間レポート用のシード
     * - partner1: 2タスクで合計1時間30分
     * - partner2: 1タスクで2時間
     * - admin: セッションあるがレポート対象外
     * - 無効化partner: セッションあるが is_allowed=false
     */
    async function seedPartnerReportData() {
      await db.insert(schema.users).values([
        {
          id: 'admin-user',
          email: 'admin@example.com',
          displayName: 'Admin User',
          role: 'admin',
          isAllowed: true,
        },
        {
          id: 'partner-1',
          email: 'partner1@example.com',
          displayName: 'パートナー1',
          role: 'partner',
          isAllowed: true,
          avatarColor: 'teal',
        },
        {
          id: 'partner-2',
          email: 'partner2@example.com',
          displayName: 'パートナー2',
          role: 'partner',
          isAllowed: true,
        },
        {
          id: 'partner-disabled',
          email: 'disabled@example.com',
          displayName: '無効化パートナー',
          role: 'partner',
          isAllowed: false,
        },
      ]);

      await db.insert(schema.labels).values({
        id: 'p-kubun',
        name: 'テスト区分',
        color: '#888888',
        projectId: null,
        ownerId: 'admin-user',
      });

      await db.insert(schema.tasks).values({
        id: 'p-task-1',
        projectType: 'MONO',
        title: 'パートナータスク1',
        kubunLabelId: 'p-kubun',
        order: 1,
        createdBy: 'admin-user',
      });
      await db.insert(schema.tasks).values({
        id: 'p-task-2',
        projectType: 'BRGREG',
        title: 'パートナータスク2',
        kubunLabelId: 'p-kubun',
        order: 2,
        createdBy: 'admin-user',
      });
      await db.insert(schema.tasks).values({
        id: 'p-task-3',
        projectType: 'MONO',
        title: 'パートナータスク3',
        kubunLabelId: 'p-kubun',
        order: 3,
        createdBy: 'admin-user',
      });

      const baseDate = new Date('2025-06-15T10:00:00Z');

      await db.insert(schema.taskSessions).values([
        // partner-1: p-task-1 で 1時間
        {
          id: 'ps-1',
          taskId: 'p-task-1',
          projectType: 'MONO',
          userId: 'partner-1',
          startedAt: new Date(baseDate.getTime()),
          endedAt: new Date(baseDate.getTime() + 3600 * 1000),
          durationSec: 3600,
        },
        // partner-1: p-task-2 で 30分
        {
          id: 'ps-2',
          taskId: 'p-task-2',
          projectType: 'BRGREG',
          userId: 'partner-1',
          startedAt: new Date(baseDate.getTime()),
          endedAt: new Date(baseDate.getTime() + 1800 * 1000),
          durationSec: 1800,
        },
        // partner-2: p-task-3 で 2時間
        {
          id: 'ps-3',
          taskId: 'p-task-3',
          projectType: 'MONO',
          userId: 'partner-2',
          startedAt: new Date(baseDate.getTime()),
          endedAt: new Date(baseDate.getTime() + 7200 * 1000),
          durationSec: 7200,
        },
        // admin: p-task-1 で 1時間（partnerじゃないので集計外）
        {
          id: 'ps-admin',
          taskId: 'p-task-1',
          projectType: 'MONO',
          userId: 'admin-user',
          startedAt: new Date(baseDate.getTime()),
          endedAt: new Date(baseDate.getTime() + 3600 * 1000),
          durationSec: 3600,
        },
        // partner-disabled: p-task-1 で 1時間（is_allowed=false でも過去稼働は集計対象）
        {
          id: 'ps-disabled',
          taskId: 'p-task-1',
          projectType: 'MONO',
          userId: 'partner-disabled',
          startedAt: new Date(baseDate.getTime()),
          endedAt: new Date(baseDate.getTime() + 3600 * 1000),
          durationSec: 3600,
        },
        // partner-1: 期間外（集計外）
        {
          id: 'ps-out',
          taskId: 'p-task-1',
          projectType: 'MONO',
          userId: 'partner-1',
          startedAt: new Date('2025-01-01T10:00:00Z'),
          endedAt: new Date('2025-01-01T11:00:00Z'),
          durationSec: 3600,
        },
        // partner-1: 未完了セッション（集計外）
        {
          id: 'ps-active',
          taskId: 'p-task-1',
          projectType: 'MONO',
          userId: 'partner-1',
          startedAt: new Date(baseDate.getTime()),
          endedAt: null,
          durationSec: 0,
        },
      ]);
    }

    it('パートナーごとの稼働時間とタスク一覧を返す', async () => {
      await seedPartnerReportData();

      const res = await app.request('/api/reports/time/partners?from=2025-06-01&to=2025-06-30');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      // partner-1 + partner-2 + partner-disabled = 3人（adminは除外、無効化は含む）
      expect(body.partners).toHaveLength(3);

      // 合計時間の降順 → partner-2(7200) が先頭
      expect(body.partners[0].userId).toBe('partner-2');
      expect(body.partners[0].displayName).toBe('パートナー2');
      expect(body.partners[0].totalDurationSec).toBe(7200);
      expect(body.partners[0].tasks).toHaveLength(1);
      expect(body.partners[0].tasks[0]).toMatchObject({
        taskId: 'p-task-3',
        title: 'パートナータスク3',
        projectType: 'MONO',
        durationSec: 7200,
      });

      // partner-1: 3600 + 1800 = 5400秒、2タスク
      expect(body.partners[1].userId).toBe('partner-1');
      expect(body.partners[1].totalDurationSec).toBe(5400);
      expect(body.partners[1].tasks).toHaveLength(2);
      // タスクは durationSec 降順
      expect(body.partners[1].tasks[0].taskId).toBe('p-task-1');
      expect(body.partners[1].tasks[0].durationSec).toBe(3600);
      expect(body.partners[1].tasks[1].taskId).toBe('p-task-2');
      expect(body.partners[1].tasks[1].durationSec).toBe(1800);

      // partner-disabled: 3600秒（無効化されても過去稼働は集計）
      expect(body.partners[2].userId).toBe('partner-disabled');
      expect(body.partners[2].totalDurationSec).toBe(3600);

      // 全体合計
      expect(body.grandTotalDurationSec).toBe(7200 + 5400 + 3600);
    });

    it('isAllowed=false のパートナーも集計に含まれる（過去の稼働実績は精算対象）', async () => {
      await seedPartnerReportData();

      const res = await app.request('/api/reports/time/partners?from=2025-06-01&to=2025-06-30');
      const body = (await res.json()) as any;

      const disabled = body.partners.find(
        (p: { userId: string }) => p.userId === 'partner-disabled'
      );
      expect(disabled).toBeDefined();
      expect(disabled.totalDurationSec).toBe(3600);
    });

    it('admin/memberロールのセッションは含まれない', async () => {
      await seedPartnerReportData();

      const res = await app.request('/api/reports/time/partners?from=2025-06-01&to=2025-06-30');
      const body = (await res.json()) as any;

      // admin-user は出てこない
      const admin = body.partners.find((p: { userId: string }) => p.userId === 'admin-user');
      expect(admin).toBeUndefined();

      // partner-1 の totalDurationSec には admin の 1時間が含まれていない
      const p1 = body.partners.find((p: { userId: string }) => p.userId === 'partner-1');
      expect(p1.totalDurationSec).toBe(5400);
    });

    it('avatar情報を返す', async () => {
      await seedPartnerReportData();

      const res = await app.request('/api/reports/time/partners?from=2025-06-01&to=2025-06-30');
      const body = (await res.json()) as any;

      const p1 = body.partners.find((p: { userId: string }) => p.userId === 'partner-1');
      expect(p1.avatarColor).toBe('teal');
      expect(p1.avatarUrl).toBeNull();
    });

    it('パートナーが居ない場合は空配列を返す', async () => {
      const res = await app.request('/api/reports/time/partners?from=2025-06-01&to=2025-06-30');
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.partners).toEqual([]);
      expect(body.grandTotalDurationSec).toBe(0);
    });

    it('from/toが未指定だと400', async () => {
      const res = await app.request('/api/reports/time/partners');
      expect(res.status).toBe(400);
    });

    it('不正な日付だと400', async () => {
      const res = await app.request('/api/reports/time/partners?from=invalid&to=2025-06-30');
      expect(res.status).toBe(400);
    });
  });
});
