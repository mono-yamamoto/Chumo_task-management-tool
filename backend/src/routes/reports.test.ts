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
});
