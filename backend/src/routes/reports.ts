import { Hono } from 'hono';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { tasks, taskSessions, labels } from '../db/schema';
import type { Env } from '../index';
import type { Database } from '../db';

type ReportEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<ReportEnv>();

const PROJECT_TYPES = [
  'REG2017',
  'BRGREG',
  'MONO',
  'MONO_ADMIN',
  'DES_FIRE',
  'DesignSystem',
  'DMREG2',
  'monosus',
  'PRREG',
] as const;

function isBRGREGProject(projectType: string): boolean {
  return projectType === 'BRGREG';
}

interface ReportItem {
  title: string;
  durationSec: number;
  over3hours?: string;
  taskId: string;
  projectType: string;
}

/**
 * レポートデータ取得共通関数
 * 「運用」区分タスクのセッション時間を集計
 */
async function fetchReportData(
  db: Database,
  fromDate: Date,
  toDate: Date,
  type: 'normal' | 'brg'
): Promise<{ items: ReportItem[]; totalDurationSec: number }> {
  // 1. 「運用」区分ラベルのIDを取得
  const allLabels = await db.select().from(labels).where(isNull(labels.projectId));

  const unyoLabel = allLabels.find((l) => l.name === '運用');
  if (!unyoLabel) {
    return { items: [], totalDurationSec: 0 };
  }

  // 2. 対象プロジェクトタイプをフィルタ
  const targetTypes = PROJECT_TYPES.filter((pt) =>
    type === 'brg' ? isBRGREGProject(pt) : !isBRGREGProject(pt)
  );

  // 3. 対象タスク（運用区分）を取得
  const targetTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectType: tasks.projectType,
      over3Reason: tasks.over3Reason,
    })
    .from(tasks)
    .where(eq(tasks.kubunLabelId, unyoLabel.id));

  // プロジェクトタイプでフィルタ
  const filteredTasks = targetTasks.filter((t) =>
    targetTypes.includes(t.projectType as (typeof PROJECT_TYPES)[number])
  );

  if (filteredTasks.length === 0) {
    return { items: [], totalDurationSec: 0 };
  }

  const taskMap = new Map(filteredTasks.map((t) => [t.id, t]));
  const taskIds = filteredTasks.map((t) => t.id);

  // 4. 日付範囲内のセッションを取得
  const sessions = await db
    .select()
    .from(taskSessions)
    .where(and(gte(taskSessions.startedAt, fromDate), lte(taskSessions.startedAt, toDate)));

  // 5. タスクIDごとにdurationSecを集計
  const durationByTaskId = new Map<string, number>();
  for (const session of sessions) {
    if (!taskIds.includes(session.taskId)) continue;
    if (!session.endedAt) continue;

    const duration =
      session.durationSec > 0
        ? session.durationSec
        : Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);

    if (duration > 0) {
      durationByTaskId.set(session.taskId, (durationByTaskId.get(session.taskId) ?? 0) + duration);
    }
  }

  // 6. 結果を構築
  const items: ReportItem[] = [];
  for (const [taskId, durationSec] of durationByTaskId) {
    const task = taskMap.get(taskId);
    if (!task) continue;

    items.push({
      title: task.title,
      durationSec,
      over3hours: durationSec > 10800 ? (task.over3Reason ?? undefined) : undefined,
      taskId,
      projectType: task.projectType,
    });
  }

  const totalDurationSec = items.reduce((sum, item) => sum + item.durationSec, 0);

  return { items, totalDurationSec };
}

/**
 * GET /time
 * 時間レポート取得
 */
app.get('/time', async (c) => {
  const db = c.get('db');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const type = (c.req.query('type') ?? 'normal') as 'normal' | 'brg';

  if (!from || !to) {
    return c.json({ error: 'Missing required parameters: from, to' }, 400);
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return c.json({ error: 'Invalid date format' }, 400);
  }

  // toDateをその日の終了時刻まで含める
  toDate.setHours(23, 59, 59, 999);

  const { items, totalDurationSec } = await fetchReportData(db, fromDate, toDate, type);

  return c.json({ items, totalDurationSec });
});

/**
 * GET /time/csv
 * 時間レポートCSVエクスポート
 */
app.get('/time/csv', async (c) => {
  const db = c.get('db');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const type = (c.req.query('type') ?? 'normal') as 'normal' | 'brg';

  if (!from || !to) {
    return c.json({ error: 'Missing required parameters: from, to' }, 400);
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return c.json({ error: 'Invalid date format' }, 400);
  }

  toDate.setHours(23, 59, 59, 999);

  const { items } = await fetchReportData(db, fromDate, toDate, type);

  // CSV生成（UTF-8+BOM/CRLF）
  const BOM = '\uFEFF';
  const csvRows = [
    ['title', 'durationSec', 'over3hours'],
    ...items.map((item) => [
      `"${item.title.replace(/"/g, '""')}"`,
      item.durationSec.toString(),
      item.over3hours ? `"${item.over3hours.replace(/"/g, '""')}"` : '',
    ]),
  ];

  const csv = BOM + csvRows.map((row) => row.join(',')).join('\r\n');

  return new globalThis.Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="report_${type}_${from}_${to}.csv"`,
    },
  });
});

export default app;
