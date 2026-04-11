import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, and, gte, lte, isNull, inArray } from 'drizzle-orm';
import { tasks, taskSessions, labels, users } from '../db/schema';
import {
  getAccessToken,
  driveSearchFiles,
  driveCreateFolder,
  driveCopyFile,
  driveGetFile,
  sheetsUpdateValues,
  sheetsClearValues,
} from '../lib/google-api';
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
  currentUserUnrecorded: boolean;
}

/**
 * レポートデータ取得共通関数
 * 「運用」区分タスクのセッション時間を集計
 */
async function fetchReportData(
  db: Database,
  fromDate: Date,
  toDate: Date,
  type: 'normal' | 'brg',
  userId?: string
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

  // 3. 対象タスクを取得
  // BRGタイプ: projectType=BRGREG の全タスク（kubunLabelId不問）
  // 通常タイプ: kubunLabelId=運用 のタスクのみ
  const taskSelect = {
    id: tasks.id,
    title: tasks.title,
    projectType: tasks.projectType,
    over3Reason: tasks.over3Reason,
    assigneeIds: tasks.assigneeIds,
  };

  let targetTasks: Awaited<ReturnType<typeof db.select<typeof taskSelect>>>;
  if (type === 'brg') {
    targetTasks = await db.select(taskSelect).from(tasks).where(eq(tasks.projectType, 'BRGREG'));
  } else {
    const allTasks = await db
      .select(taskSelect)
      .from(tasks)
      .where(eq(tasks.kubunLabelId, unyoLabel.id));
    targetTasks = allTasks.filter((t) =>
      targetTypes.includes(t.projectType as (typeof PROJECT_TYPES)[number])
    );
  }

  if (targetTasks.length === 0) {
    return { items: [], totalDurationSec: 0 };
  }

  const taskMap = new Map(targetTasks.map((t) => [t.id, t]));
  const taskIds = targetTasks.map((t) => t.id);

  // 4. 対象タスクの日付範囲内セッションを取得
  const sessions = await db
    .select()
    .from(taskSessions)
    .where(
      and(
        inArray(taskSessions.taskId, taskIds),
        gte(taskSessions.startedAt, fromDate),
        lte(taskSessions.startedAt, toDate)
      )
    );

  // 5. タスクIDごとにdurationSecを集計 + セッション記録済みユーザーを追跡
  const durationByTaskId = new Map<string, number>();
  const recordedUsersByTaskId = new Map<string, Set<string>>();
  for (const session of sessions) {
    if (!session.endedAt) continue;

    const duration =
      session.durationSec > 0
        ? session.durationSec
        : Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);

    if (duration > 0) {
      durationByTaskId.set(session.taskId, (durationByTaskId.get(session.taskId) ?? 0) + duration);
      let userSet = recordedUsersByTaskId.get(session.taskId);
      if (!userSet) {
        userSet = new Set();
        recordedUsersByTaskId.set(session.taskId, userSet);
      }
      userSet.add(session.userId);
    }
  }

  // 6. 結果を構築
  const items: ReportItem[] = [];
  for (const [taskId, durationSec] of durationByTaskId) {
    const task = taskMap.get(taskId);
    if (!task) continue;

    const isAssigned = userId ? task.assigneeIds.includes(userId) : false;
    const hasSession = userId ? (recordedUsersByTaskId.get(taskId)?.has(userId) ?? false) : false;

    items.push({
      title: task.title,
      durationSec,
      over3hours: durationSec > 10800 ? (task.over3Reason ?? undefined) : undefined,
      taskId,
      projectType: task.projectType,
      currentUserUnrecorded: isAssigned && !hasSession,
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

  const userId = c.get('userId');
  const { items, totalDurationSec } = await fetchReportData(db, fromDate, toDate, type, userId);

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

// --- スプレッドシート出力 ---

/** durationSec → "H:MM:SS" 形式 */
function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 「データ」シート用の行データを構築
 * 通常・BRG の生データのみ出力（ハードコード値や集計行は不要）
 */
function buildDataSheetRows(
  normalItems: ReportItem[],
  brgItems: ReportItem[]
): (string | number)[][] {
  const rows: (string | number)[][] = [];

  // 通常セクション
  rows.push(['■通常■', '', '']);
  rows.push(['案件名', '実績時間', '3時間超内容']);
  for (const item of normalItems) {
    rows.push([item.title, formatDuration(item.durationSec), item.over3hours || '']);
  }

  rows.push(['', '', '']); // 空行

  // BRGセクション
  rows.push(['■BRG■', '', '']);
  rows.push(['案件名', '実績時間', '3時間超内容']);
  for (const item of brgItems) {
    rows.push([item.title, formatDuration(item.durationSec), item.over3hours || '']);
  }

  return rows;
}

const exportCheckSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12),
});

const exportSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12),
  overwrite: z.boolean().optional(),
  folderId: z.string().optional(),
});

/** Google認証チェック共通処理 */
async function resolveAccessToken(
  db: Database,
  userId: string,
  env: ReportEnv['Bindings']
): Promise<{ accessToken: string } | { error: string; requiresAuth?: boolean; status: number }> {
  const [user] = await db
    .select({ googleRefreshToken: users.googleRefreshToken })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.googleRefreshToken) {
    return {
      error: 'Google Drive認証が必要です。設定ページでGoogle Driveと連携してください。',
      requiresAuth: true,
      status: 400,
    };
  }

  const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { error: 'OAuth configuration is incomplete', status: 500 };
  }

  const accessToken = await getAccessToken(clientId, clientSecret, user.googleRefreshToken);
  if (!accessToken) {
    return {
      error: 'Google Drive認証トークンの取得に失敗しました。設定ページで再認証してください。',
      requiresAuth: true,
      status: 401,
    };
  }

  return { accessToken };
}

/**
 * POST /time/export-check
 * 月フォルダの存在チェック
 */
app.post('/time/export-check', zValidator('json', exportCheckSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const { month } = c.req.valid('json');

  const result = await resolveAccessToken(db, userId, c.env);
  if ('error' in result) {
    return c.json({ error: result.error, requiresAuth: result.requiresAuth }, result.status as 400);
  }

  const parentId = c.env.REPORT_DRIVE_PARENT_ID;
  if (!parentId) {
    return c.json({ error: 'Report Drive configuration is incomplete' }, 500);
  }

  const folderName = `${month}月`;
  const parentFolder = await driveGetFile(result.accessToken, parentId);
  const driveId = parentFolder?.driveId || undefined;

  const escapedName = folderName.replace(/'/g, "\\'");
  const existingFolders = await driveSearchFiles(
    result.accessToken,
    `name='${escapedName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    driveId
  );

  if (existingFolders.length > 0) {
    return c.json({ exists: true, folderId: existingFolders[0].id });
  }

  return c.json({ exists: false });
});

/**
 * POST /time/export
 * スプレッドシート作成・書き込み
 */
app.post('/time/export', zValidator('json', exportSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const { year, month, overwrite, folderId: existingFolderId } = c.req.valid('json');

  const result = await resolveAccessToken(db, userId, c.env);
  if ('error' in result) {
    return c.json({ error: result.error, requiresAuth: result.requiresAuth }, result.status as 400);
  }

  const { accessToken } = result;
  const parentId = c.env.REPORT_DRIVE_PARENT_ID;
  const templateId = c.env.REPORT_TEMPLATE_ID;
  if (!parentId || !templateId) {
    return c.json({ error: 'Report Drive configuration is incomplete' }, 500);
  }

  const mm = String(month).padStart(2, '0');
  const fileName = `ソニー損害保険株式会社様_運用工数表-${year}_${mm}`;

  let folderId: string;
  let spreadsheetId: string | null = null;

  if (existingFolderId) {
    folderId = existingFolderId;

    if (overwrite) {
      // ファイル名で対象スプレッドシートを特定してクリア→再利用
      const escapedFileName = fileName.replace(/'/g, "\\'");
      const matchingSheets = await driveSearchFiles(
        accessToken,
        `name='${escapedFileName}' and '${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
      );
      if (matchingSheets.length > 0) {
        spreadsheetId = matchingSheets[0].id;
        const cleared = await sheetsClearValues(accessToken, spreadsheetId, 'データ!A:Z');
        if (!cleared) {
          return c.json({ error: 'スプレッドシートのクリアに失敗しました' }, 500);
        }
      }
    }
  } else {
    // フォルダ新規作成
    const folderName = `${month}月`;
    const newFolderId = await driveCreateFolder(accessToken, folderName, parentId);
    if (!newFolderId) {
      return c.json({ error: 'フォルダの作成に失敗しました' }, 500);
    }
    folderId = newFolderId;
  }

  // スプレッドシートが無い場合はテンプレートからコピー
  if (!spreadsheetId) {
    spreadsheetId = await driveCopyFile(
      accessToken,
      templateId,
      fileName,
      folderId,
      'application/vnd.google-apps.spreadsheet'
    );
    if (!spreadsheetId) {
      return c.json({ error: 'テンプレートのコピーに失敗しました' }, 500);
    }
  }

  // レポートデータ取得
  const lastDay = new Date(year, month, 0).getDate();
  const fromDate = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
  const toDate = new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  );
  toDate.setHours(23, 59, 59, 999);

  const [normalData, brgData] = await Promise.all([
    fetchReportData(db, fromDate, toDate, 'normal'),
    fetchReportData(db, fromDate, toDate, 'brg'),
  ]);

  // 「データ」シートにデータ書き込み
  const rows = buildDataSheetRows(normalData.items, brgData.items);
  const range = `データ!A1:C${rows.length}`;
  const written = await sheetsUpdateValues(accessToken, spreadsheetId, range, rows);
  if (!written) {
    return c.json({ error: 'スプレッドシートへのデータ書き込みに失敗しました' }, 500);
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  return c.json({ success: true, spreadsheetUrl });
});

export default app;
