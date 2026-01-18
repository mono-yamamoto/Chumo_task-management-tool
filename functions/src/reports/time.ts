import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { PROJECT_TYPES, isBRGREGProject } from './projectTypes';

const db = getFirestore();

// レポートアイテムの型定義
interface ReportItem {
  title: string;
  durationSec: number;
  over3hours?: string;
  taskId: string;
  projectType: string;
}

// タスク情報をキャッシュする型
interface TaskInfo {
  title: string;
  over3Reason?: string;
  projectType: string;
}

/**
 * Timestampをミリ秒に変換するヘルパー関数
 */
function toMillis(value: Timestamp | { toDate?: () => Date } | Date | string): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().getTime();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return new Date(value as string).getTime();
}

/**
 * セッションの作業時間（秒）を計算
 */
function calculateSessionDuration(session: FirebaseFirestore.DocumentData): number {
  if (!session.endedAt) return 0;

  // durationSecが存在する場合はそれを使用
  if (session.durationSec && session.durationSec > 0) {
    return session.durationSec;
  }

  // 開始時刻と終了時刻から計算
  if (session.startedAt && session.endedAt) {
    const startMillis = toMillis(session.startedAt);
    const endMillis = toMillis(session.endedAt);
    return Math.floor((endMillis - startMillis) / 1000);
  }

  return 0;
}

/**
 * レポートデータを取得する共通関数（最適化版）
 * - 並列処理で複数プロジェクトのタスクとセッションを取得
 * - N+1問題を解消
 */
async function fetchReportData(
  fromDate: Date,
  toDate: Date,
  type: 'normal' | 'brg'
): Promise<{ items: ReportItem[]; totalDurationSec: number }> {
  // 1. 「運用」区分ラベルのIDを取得
  const labelsSnapshot = await db.collection('labels').where('projectId', '==', null).get();
  const unyoLabel = labelsSnapshot.docs.find((doc) => doc.data().name === '運用');
  if (!unyoLabel) {
    return { items: [], totalDurationSec: 0 };
  }
  const unyoLabelId = unyoLabel.id;

  // 2. 対象プロジェクトをフィルタ
  const targetProjects = PROJECT_TYPES.filter((projectType) => {
    if (type === 'brg') return isBRGREGProject(projectType);
    return !isBRGREGProject(projectType);
  });

  // 3. 並列で各プロジェクトのタスクとセッションを取得
  const projectPromises = targetProjects.map(async (projectType) => {
    // 3a. 「運用」タスクを取得
    const tasksSnapshot = await db
      .collection('projects')
      .doc(projectType)
      .collection('tasks')
      .where('kubunLabelId', '==', unyoLabelId)
      .get();

    if (tasksSnapshot.empty) {
      return [];
    }

    // タスク情報をマップに格納
    const taskMap = new Map<string, TaskInfo>();
    for (const doc of tasksSnapshot.docs) {
      const data = doc.data();
      taskMap.set(doc.id, {
        title: data.title as string,
        over3Reason: data.over3Reason as string | undefined,
        projectType,
      });
    }

    // 3b. 日付範囲内のセッションを取得
    const sessionsSnapshot = await db
      .collection('projects')
      .doc(projectType)
      .collection('taskSessions')
      .where('startedAt', '>=', fromDate)
      .where('startedAt', '<=', toDate)
      .get();

    // 3c. セッションをタスクIDごとに集計
    const durationByTaskId = new Map<string, number>();
    for (const sessionDoc of sessionsSnapshot.docs) {
      const session = sessionDoc.data();
      const { taskId } = session;

      // 対象タスク（運用）のセッションのみ処理
      if (!taskId || !taskMap.has(taskId)) {
        continue;
      }

      const duration = calculateSessionDuration(session);
      if (duration > 0) {
        durationByTaskId.set(taskId, (durationByTaskId.get(taskId) || 0) + duration);
      }
    }

    // 3d. 結果を構築
    const projectItems: ReportItem[] = [];
    for (const [taskId, durationSec] of durationByTaskId) {
      const taskInfo = taskMap.get(taskId);
      if (!taskInfo) continue;

      projectItems.push({
        title: taskInfo.title,
        durationSec,
        over3hours: durationSec > 10800 ? taskInfo.over3Reason : undefined,
        taskId,
        projectType: taskInfo.projectType,
      });
    }

    return projectItems;
  });

  // 4. 全プロジェクトの結果を集約
  const allResults = await Promise.all(projectPromises);
  const items = allResults.flat();
  const totalDurationSec = items.reduce((sum, item) => sum + item.durationSec, 0);

  return { items, totalDurationSec };
}

export const getTimeReport = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { from, to, type = 'normal' } = req.query;

      if (!from || !to) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);

      // 日付の検証
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }

      // toDateをその日の終了時刻（23:59:59.999）まで含める
      toDate.setHours(23, 59, 59, 999);

      // 最適化された共通関数でデータを取得
      const reportType = type === 'brg' ? 'brg' : 'normal';
      const { items, totalDurationSec } = await fetchReportData(fromDate, toDate, reportType);

      res.status(200).json({
        items,
        totalDurationSec,
      });
    } catch (error) {
      console.error('Get time report error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        error: 'Internal server error',
        details: errorMessage,
      });
    }
  }
);

export const exportTimeReportCSV = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { from, to, type = 'normal' } = req.query;

      if (!from || !to) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);

      // 日付の検証
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }

      // toDateをその日の終了時刻（23:59:59.999）まで含める
      toDate.setHours(23, 59, 59, 999);

      // 最適化された共通関数でデータを取得
      const reportType = type === 'brg' ? 'brg' : 'normal';
      const { items } = await fetchReportData(fromDate, toDate, reportType);

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

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="report_${type}_${fromDate.toISOString().split('T')[0]}_${toDate.toISOString().split('T')[0]}.csv"`
      );
      res.status(200).send(csv);
    } catch (error) {
      console.error('Export CSV error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        error: 'Internal server error',
        details: errorMessage,
      });
    }
  }
);
