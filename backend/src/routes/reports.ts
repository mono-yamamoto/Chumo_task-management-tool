import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, and, gte, lte, isNull, inArray, notInArray } from 'drizzle-orm';
import { tasks, taskSessions, labels, users, projectTypeEnum } from '../db/schema';
import {
  getAccessToken,
  driveSearchFiles,
  driveCreateFolder,
  driveCopyFile,
  driveGetFile,
  sheetsUpdateValues,
  sheetsClearValues,
} from '../lib/google-api';
import { resolveAvatarUrl, type SignEnv } from './users';
import type { Env } from '../index';
import type { Database } from '../db';

type ReportEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<ReportEnv>();

/** レポート集計の種別 */
type ReportFetchType = 'normal' | 'brg' | 'faq_imp';

type ProjectTypeValue = (typeof projectTypeEnum.enumValues)[number];

/** 独立してレポート集計するプロジェクトタイプ（集計種別 → projectType） */
const STANDALONE_REPORT_PROJECT: Record<Exclude<ReportFetchType, 'normal'>, ProjectTypeValue> = {
  brg: 'BRGREG',
  faq_imp: 'FAQ_IMP',
};

const STANDALONE_PROJECT_TYPES_ARRAY = Object.values(STANDALONE_REPORT_PROJECT);

/** クエリの type パラメータを正規化（不正値は normal にフォールバック） */
function normalizeReportType(value: string | undefined): ReportFetchType {
  return value && value in STANDALONE_REPORT_PROJECT ? (value as ReportFetchType) : 'normal';
}

/**
 * レポート系API共通: from/to クエリのパース・検証
 * - 必須チェック、ISO日付検証、toDate を 23:59:59.999 まで含むよう調整
 */
function parseReportDateRange(
  from: string | undefined,
  to: string | undefined
): { fromDate: Date; toDate: Date } | { error: string; status: 400 } {
  if (!from || !to) {
    return { error: 'Missing required parameters: from, to', status: 400 };
  }
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { error: 'Invalid date format', status: 400 };
  }
  toDate.setHours(23, 59, 59, 999);
  return { fromDate, toDate };
}

/**
 * セッションの実稼働秒数を返す（未完了は null）
 * - durationSec > 0 ならそれを採用
 * - 0 以下なら endedAt - startedAt で再計算（過去データの互換）
 */
function computeSessionDurationSec(session: {
  startedAt: Date;
  endedAt: Date | null;
  durationSec: number;
}): number | null {
  if (!session.endedAt) return null;
  const duration =
    session.durationSec > 0
      ? session.durationSec
      : Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
  return duration > 0 ? duration : null;
}

/**
 * セッションの実稼働秒数のうち、指定期間と重なる分だけを返す
 * - 期間と完全に重ならない: 0
 * - 期間内に完全に収まる: 全durationSec
 * - 部分的に重なる: overlap時間 / セッション全体時間 で按分
 */
function computeSessionDurationInRangeSec(
  session: { startedAt: Date; endedAt: Date | null; durationSec: number },
  fromDate: Date,
  toDate: Date
): number {
  if (!session.endedAt) return 0;
  if (session.endedAt < fromDate || session.startedAt > toDate) return 0;

  const total = computeSessionDurationSec(session);
  if (total === null) return 0;

  // 完全に範囲内ならそのまま
  if (session.startedAt >= fromDate && session.endedAt <= toDate) return total;

  // 期間と重なる秒数 / セッション全体の秒数 で按分
  const overlapStart = session.startedAt > fromDate ? session.startedAt : fromDate;
  const overlapEnd = session.endedAt < toDate ? session.endedAt : toDate;
  const overlapSec = Math.max(
    0,
    Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 1000)
  );
  const sessionRealSec = Math.max(
    1,
    Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
  );

  return Math.floor(total * (overlapSec / sessionRealSec));
}

/** 「運用」区分ラベルのIDを取得（無ければ null） */
async function getUnyoLabelId(db: Database): Promise<string | null> {
  const allLabels = await db.select().from(labels).where(isNull(labels.projectId));
  return allLabels.find((l) => l.name === '運用')?.id ?? null;
}

/** CSVインジェクション防止: 先頭が数式トリガー文字の場合にシングルクォートをプレフィクス */
const CSV_FORMULA_TRIGGER = /^[=+\-@\t\r]/;
function sanitizeCsvCell(value: string): string {
  return CSV_FORMULA_TRIGGER.test(value) ? `'${value}` : value;
}

interface TaskRow {
  id: string;
  title: string;
  projectType: string;
  over3Reason: string | null;
  assigneeIds: string[];
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
  type: ReportFetchType,
  unyoLabelId: string | null,
  userId?: string
): Promise<{ items: ReportItem[]; totalDurationSec: number }> {
  // 「運用」区分ラベルが無ければ集計対象なし
  if (!unyoLabelId) {
    return { items: [], totalDurationSec: 0 };
  }

  // 対象タスクを取得
  // 独立集計タイプ(BRG/FAQ_IMP): projectType一致の全タスク（kubunLabelId不問）
  // 通常タイプ: kubunLabelId=運用 のタスクのうち、独立集計タイプを除外
  const taskSelect = {
    id: tasks.id,
    title: tasks.title,
    projectType: tasks.projectType,
    over3Reason: tasks.over3Reason,
    assigneeIds: tasks.assigneeIds,
  };

  let targetTasks: TaskRow[];
  if (type !== 'normal') {
    targetTasks = await db
      .select(taskSelect)
      .from(tasks)
      .where(eq(tasks.projectType, STANDALONE_REPORT_PROJECT[type]));
  } else {
    // 運用区分 かつ 独立集計タイプ(BRGREG/FAQ_IMP)以外 を SQL レベルで絞る
    targetTasks = await db
      .select(taskSelect)
      .from(tasks)
      .where(
        and(
          eq(tasks.kubunLabelId, unyoLabelId),
          notInArray(tasks.projectType, STANDALONE_PROJECT_TYPES_ARRAY)
        )
      );
  }

  if (targetTasks.length === 0) {
    return { items: [], totalDurationSec: 0 };
  }

  const taskMap = new Map(targetTasks.map((t) => [t.id, t]));
  const taskIds = targetTasks.map((t) => t.id);

  // 4. 対象タスクの「期間と重なる」セッションを取得（月またぎは按分処理）
  const sessions = await db
    .select()
    .from(taskSessions)
    .where(
      and(
        inArray(taskSessions.taskId, taskIds),
        lte(taskSessions.startedAt, toDate),
        gte(taskSessions.endedAt, fromDate)
      )
    );

  // 5. タスクIDごとにdurationSecを集計 + セッション記録済みユーザーを追跡
  const durationByTaskId = new Map<string, number>();
  const recordedUsersByTaskId = new Map<string, Set<string>>();
  for (const session of sessions) {
    const duration = computeSessionDurationInRangeSec(session, fromDate, toDate);
    if (duration <= 0) continue;

    durationByTaskId.set(session.taskId, (durationByTaskId.get(session.taskId) ?? 0) + duration);
    let userSet = recordedUsersByTaskId.get(session.taskId);
    if (!userSet) {
      userSet = new Set();
      recordedUsersByTaskId.set(session.taskId, userSet);
    }
    userSet.add(session.userId);
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

interface PartnerTaskItem {
  taskId: string;
  title: string;
  projectType: string;
  durationSec: number;
}

interface PartnerReportItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  totalDurationSec: number;
  tasks: PartnerTaskItem[];
}

/** 削除済みタスクのタイトル */
const DELETED_TASK_TITLE = '[削除済みタスク]';

/**
 * パートナー稼働時間レポートを集計
 * - users.role = 'partner' のユーザーごと（isAllowed問わず：過去の稼働実績も精算対象）
 *   に期間内（または重なる）の task_sessions を集計
 * - 月またぎセッションは期間内の重なり比率で按分
 * - 「運用」ラベル等の条件は付けない（全タスクが対象）
 * - 稼働ゼロのpartnerはレスポンスから除外
 * - avatarUrl は R2 署名付きURLに解決して返す
 */
async function fetchPartnerReportData(
  db: Database,
  fromDate: Date,
  toDate: Date,
  signEnv: SignEnv
): Promise<{ partners: PartnerReportItem[]; grandTotalDurationSec: number }> {
  const partnerUsers = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      avatarColor: users.avatarColor,
    })
    .from(users)
    .where(eq(users.role, 'partner'));

  if (partnerUsers.length === 0) {
    return { partners: [], grandTotalDurationSec: 0 };
  }

  const partnerIds = partnerUsers.map((u) => u.id);

  // 期間と重なるセッションを取得（endedAt is null = 未完了は SQL レベルで除外）
  const sessions = await db
    .select({
      userId: taskSessions.userId,
      taskId: taskSessions.taskId,
      startedAt: taskSessions.startedAt,
      endedAt: taskSessions.endedAt,
      durationSec: taskSessions.durationSec,
    })
    .from(taskSessions)
    .where(
      and(
        inArray(taskSessions.userId, partnerIds),
        lte(taskSessions.startedAt, toDate),
        gte(taskSessions.endedAt, fromDate)
      )
    );

  // userId → taskId → durationSec の二重マップで集計（月またぎは按分）
  const durationByUserTask = new Map<string, Map<string, number>>();
  for (const session of sessions) {
    const duration = computeSessionDurationInRangeSec(session, fromDate, toDate);
    if (duration <= 0) continue;

    let taskMap = durationByUserTask.get(session.userId);
    if (!taskMap) {
      taskMap = new Map();
      durationByUserTask.set(session.userId, taskMap);
    }
    taskMap.set(session.taskId, (taskMap.get(session.taskId) ?? 0) + duration);
  }

  // 集計対象タスクの情報を一括取得
  const allTaskIds = new Set<string>();
  for (const taskMap of durationByUserTask.values()) {
    for (const taskId of taskMap.keys()) allTaskIds.add(taskId);
  }

  const taskInfoMap = new Map<string, { title: string; projectType: string }>();
  if (allTaskIds.size > 0) {
    const taskRows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        projectType: tasks.projectType,
      })
      .from(tasks)
      .where(inArray(tasks.id, Array.from(allTaskIds)));
    for (const t of taskRows) {
      taskInfoMap.set(t.id, { title: t.title, projectType: t.projectType });
    }
  }

  // 稼働ありの partner だけ抽出（ゼロ時間はノイズなので除外）
  const partnersRaw = partnerUsers.flatMap((user) => {
    const taskMap = durationByUserTask.get(user.id);
    if (!taskMap || taskMap.size === 0) return [];

    const taskItems: PartnerTaskItem[] = [];
    let totalDurationSec = 0;

    for (const [taskId, durationSec] of taskMap) {
      // 削除済みタスクは「[削除済みタスク]」として保持（無音で落とすと精算とズレる）
      const info = taskInfoMap.get(taskId) ?? { title: DELETED_TASK_TITLE, projectType: '' };
      taskItems.push({
        taskId,
        title: info.title,
        projectType: info.projectType,
        durationSec,
      });
      totalDurationSec += durationSec;
    }

    if (totalDurationSec === 0) return [];

    taskItems.sort((a, b) => b.durationSec - a.durationSec);

    return [
      {
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        avatarColor: user.avatarColor,
        totalDurationSec,
        tasks: taskItems,
      },
    ];
  });

  // avatarUrl を R2 署名付きURLに変換
  const partners: PartnerReportItem[] = await Promise.all(
    partnersRaw.map((p) => resolveAvatarUrl(p, signEnv))
  );

  // 合計時間の降順
  partners.sort((a, b) => b.totalDurationSec - a.totalDurationSec);

  const grandTotalDurationSec = partners.reduce((sum, p) => sum + p.totalDurationSec, 0);

  return { partners, grandTotalDurationSec };
}

/**
 * GET /time/partners
 * パートナー稼働時間レポート取得
 */
app.get('/time/partners', async (c) => {
  const db = c.get('db');
  const range = parseReportDateRange(c.req.query('from'), c.req.query('to'));
  if ('error' in range) return c.json({ error: range.error }, range.status);

  const env = c.env as ReportEnv['Bindings'];
  const result = await fetchPartnerReportData(db, range.fromDate, range.toDate, env);
  return c.json(result);
});

/**
 * GET /time
 * 時間レポート取得
 */
app.get('/time', async (c) => {
  const db = c.get('db');
  const type = normalizeReportType(c.req.query('type'));
  const range = parseReportDateRange(c.req.query('from'), c.req.query('to'));
  if ('error' in range) return c.json({ error: range.error }, range.status);

  const userId = c.get('userId');
  const unyoLabelId = await getUnyoLabelId(db);
  const { items, totalDurationSec } = await fetchReportData(
    db,
    range.fromDate,
    range.toDate,
    type,
    unyoLabelId,
    userId
  );

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
  const type = normalizeReportType(c.req.query('type'));
  const range = parseReportDateRange(from, to);
  if ('error' in range) return c.json({ error: range.error }, range.status);

  const unyoLabelId = await getUnyoLabelId(db);
  const { items } = await fetchReportData(db, range.fromDate, range.toDate, type, unyoLabelId);

  // CSV生成（UTF-8+BOM/CRLF）
  const BOM = '\uFEFF';
  const csvRows = [
    ['title', 'durationSec', 'over3hours'],
    ...items.map((item) => [
      `"${sanitizeCsvCell(item.title).replace(/"/g, '""')}"`,
      item.durationSec.toString(),
      item.over3hours ? `"${sanitizeCsvCell(item.over3hours).replace(/"/g, '""')}"` : '',
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
  brgItems: ReportItem[],
  faqImpItems: ReportItem[]
): (string | number)[][] {
  const rows: (string | number)[][] = [];

  const pushSection = (heading: string, items: ReportItem[]) => {
    rows.push([heading, '', '']);
    rows.push(['案件名', '実績時間', '3時間超内容']);
    for (const item of items) {
      rows.push([item.title, formatDuration(item.durationSec), item.over3hours || '']);
    }
  };

  // 通常セクション
  pushSection('■通常■', normalItems);

  rows.push(['', '', '']); // 空行

  // BRGセクション
  pushSection('■BRG■', brgItems);

  rows.push(['', '', '']); // 空行

  // FAQ_IMPセクション
  pushSection('■FAQ_IMP■', faqImpItems);

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

  const unyoLabelId = await getUnyoLabelId(db);
  const [normalData, brgData, faqImpData] = await Promise.all([
    fetchReportData(db, fromDate, toDate, 'normal', unyoLabelId),
    fetchReportData(db, fromDate, toDate, 'brg', unyoLabelId),
    fetchReportData(db, fromDate, toDate, 'faq_imp', unyoLabelId),
  ]);

  // 「データ」シートにデータ書き込み
  const rows = buildDataSheetRows(normalData.items, brgData.items, faqImpData.items);
  const range = `データ!A1:C${rows.length}`;
  const written = await sheetsUpdateValues(accessToken, spreadsheetId, range, rows);
  if (!written) {
    return c.json({ error: 'スプレッドシートへのデータ書き込みに失敗しました' }, 500);
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  return c.json({ success: true, spreadsheetUrl });
});

export default app;
