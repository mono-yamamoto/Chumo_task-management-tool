import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { PROJECT_TYPES, isBRGREGProject } from './projectTypes';

const db = getFirestore();

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

      // 「運用」区分ラベルのIDを取得
      const labelsSnapshot = await db.collection('labels').where('projectId', '==', null).get();
      const unyoLabel = labelsSnapshot.docs.find((doc) => doc.data().name === '運用');
      if (!unyoLabel) {
        res.status(200).json({
          items: [],
          totalDurationSec: 0,
        });
        return;
      }
      const unyoLabelId = unyoLabel.id;

      // 全プロジェクトタイプからタスクとセッションを取得
      const items: Array<{
        title: string;
        durationSec: number;
        over3hours?: string;
        taskId: string;
        projectType: string;
      }> = [];
      let totalDurationSec = 0;

      for (const projectType of PROJECT_TYPES) {
        const tasksSnapshot = await db
          .collection('projects')
          .doc(projectType)
          .collection('tasks')
          .get();

        for (const taskDoc of tasksSnapshot.docs) {
          const task = taskDoc.data();

          // 区分が「運用」のタスクのみを集計
          if (task.kubunLabelId !== unyoLabelId) {
            continue;
          }

          // BRGフィルタ（プロジェクト名で判定）
          if (type === 'brg' && !isBRGREGProject(projectType)) {
            continue;
          }
          if (type === 'normal' && isBRGREGProject(projectType)) {
            continue;
          }

          // セッション取得
          // インデックスエラーを避けるため、まずtaskIdでフィルタしてから日付範囲でフィルタ
          let sessionsSnapshot;
          try {
            sessionsSnapshot = await db
              .collection('projects')
              .doc(projectType)
              .collection('taskSessions')
              .where('taskId', '==', taskDoc.id)
              .where('startedAt', '>=', fromDate)
              .where('startedAt', '<=', toDate)
              .get();
          } catch (indexError: any) {
            // インデックスエラーの場合、taskIdのみでフィルタしてクライアント側で日付フィルタ
            if (
              indexError?.code === 'failed-precondition' ||
              indexError?.message?.includes('index')
            ) {
              const allSessionsSnapshot = await db
                .collection('projects')
                .doc(projectType)
                .collection('taskSessions')
                .where('taskId', '==', taskDoc.id)
                .get();

              // クライアント側で日付範囲をフィルタ
              sessionsSnapshot = {
                docs: allSessionsSnapshot.docs.filter((doc) => {
                  const session = doc.data();
                  const { startedAt } = session;
                  if (!startedAt) return false;
                  // Firestore Admin SDKではTimestampオブジェクトをDateに変換
                  const startedAtDate =
                    startedAt instanceof Timestamp
                      ? startedAt.toDate()
                      : (startedAt as any).toDate
                        ? (startedAt as any).toDate()
                        : new Date(startedAt);
                  return startedAtDate >= fromDate && startedAtDate <= toDate;
                }),
              } as any;
            } else {
              throw indexError;
            }
          }

          let taskDurationSec = 0;
          for (const sessionDoc of sessionsSnapshot.docs) {
            const session = sessionDoc.data();
            if (session.endedAt) {
              // durationSecが存在する場合はそれを使用、ない場合は開始時刻と終了時刻から計算
              if (session.durationSec && session.durationSec > 0) {
                taskDurationSec += session.durationSec;
              } else if (session.startedAt && session.endedAt) {
                const startedAtDate =
                  session.startedAt instanceof Timestamp
                    ? session.startedAt.toDate()
                    : (session.startedAt as any).toDate
                      ? (session.startedAt as any).toDate()
                      : new Date(session.startedAt);
                const endedAtDate =
                  session.endedAt instanceof Timestamp
                    ? session.endedAt.toDate()
                    : (session.endedAt as any).toDate
                      ? (session.endedAt as any).toDate()
                      : new Date(session.endedAt);
                taskDurationSec += Math.floor((endedAtDate.getTime() - startedAtDate.getTime()) / 1000);
              }
            }
          }

          if (taskDurationSec > 0) {
            items.push({
              title: task.title,
              durationSec: taskDurationSec,
              over3hours: taskDurationSec > 10800 ? task.over3Reason : undefined, // 3時間 = 10800秒
              taskId: taskDoc.id,
              projectType: projectType,
            });
            totalDurationSec += taskDurationSec;
          }
        }
      }

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

      // 「運用」区分ラベルのIDを取得
      const labelsSnapshot = await db.collection('labels').where('projectId', '==', null).get();
      const unyoLabel = labelsSnapshot.docs.find((doc) => doc.data().name === '運用');
      if (!unyoLabel) {
        res.status(200).send('');
        return;
      }
      const unyoLabelId = unyoLabel.id;

      // データ取得（getTimeReportと同じロジック）
      const items: Array<{
        title: string;
        durationSec: number;
        over3hours?: string;
        taskId: string;
        projectType: string;
      }> = [];

      for (const projectType of PROJECT_TYPES) {
        const tasksSnapshot = await db
          .collection('projects')
          .doc(projectType)
          .collection('tasks')
          .get();

        for (const taskDoc of tasksSnapshot.docs) {
          const task = taskDoc.data();

          // 区分が「運用」のタスクのみを集計
          if (task.kubunLabelId !== unyoLabelId) {
            continue;
          }

          // BRGフィルタ（プロジェクト名で判定）
          if (type === 'brg' && !isBRGREGProject(projectType)) {
            continue;
          }
          if (type === 'normal' && isBRGREGProject(projectType)) {
            continue;
          }

          // セッション取得
          // インデックスエラーを避けるため、まずtaskIdでフィルタしてから日付範囲でフィルタ
          let sessionsSnapshot;
          try {
            sessionsSnapshot = await db
              .collection('projects')
              .doc(projectType)
              .collection('taskSessions')
              .where('taskId', '==', taskDoc.id)
              .where('startedAt', '>=', fromDate)
              .where('startedAt', '<=', toDate)
              .get();
          } catch (indexError: any) {
            // インデックスエラーの場合、taskIdのみでフィルタしてクライアント側で日付フィルタ
            if (
              indexError?.code === 'failed-precondition' ||
              indexError?.message?.includes('index')
            ) {
              const allSessionsSnapshot = await db
                .collection('projects')
                .doc(projectType)
                .collection('taskSessions')
                .where('taskId', '==', taskDoc.id)
                .get();

              // クライアント側で日付範囲をフィルタ
              sessionsSnapshot = {
                docs: allSessionsSnapshot.docs.filter((doc) => {
                  const session = doc.data();
                  const { startedAt } = session;
                  if (!startedAt) return false;
                  // Firestore Admin SDKではTimestampオブジェクトをDateに変換
                  const startedAtDate =
                    startedAt instanceof Timestamp
                      ? startedAt.toDate()
                      : (startedAt as any).toDate
                        ? (startedAt as any).toDate()
                        : new Date(startedAt);
                  return startedAtDate >= fromDate && startedAtDate <= toDate;
                }),
              } as any;
            } else {
              throw indexError;
            }
          }

          let taskDurationSec = 0;
          for (const sessionDoc of sessionsSnapshot.docs) {
            const session = sessionDoc.data();
            if (session.endedAt) {
              // durationSecが存在する場合はそれを使用、ない場合は開始時刻と終了時刻から計算
              if (session.durationSec && session.durationSec > 0) {
                taskDurationSec += session.durationSec;
              } else if (session.startedAt && session.endedAt) {
                const startedAtDate =
                  session.startedAt instanceof Timestamp
                    ? session.startedAt.toDate()
                    : (session.startedAt as any).toDate
                      ? (session.startedAt as any).toDate()
                      : new Date(session.startedAt);
                const endedAtDate =
                  session.endedAt instanceof Timestamp
                    ? session.endedAt.toDate()
                    : (session.endedAt as any).toDate
                      ? (session.endedAt as any).toDate()
                      : new Date(session.endedAt);
                taskDurationSec += Math.floor((endedAtDate.getTime() - startedAtDate.getTime()) / 1000);
              }
            }
          }

          if (taskDurationSec > 0) {
            items.push({
              title: task.title,
              durationSec: taskDurationSec,
              over3hours: taskDurationSec > 10800 ? task.over3Reason : undefined, // 3時間 = 10800秒
              taskId: taskDoc.id,
              projectType: projectType,
            });
          }
        }
      }

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
