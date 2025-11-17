import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PROJECT_TYPES } from '../reports/projectTypes';

initializeApp();
const db = getFirestore();

/**
 * Backlogプロジェクトキーからプロジェクトタイプへのマッピング
 * 必要に応じて環境変数や設定ファイルから読み込む
 */
const BACKLOG_PROJECT_KEY_MAP: Record<string, string> = {
  // 例: 'BACKLOG_PROJECT_KEY' => 'REG2017'
  // 実際のマッピングは環境変数や設定から読み込む
};

export const syncBacklog = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // TODO: 署名検証
      // const secret = await getSecret("MAKE_WEBHOOK_SECRET");
      // verifySignature(req, secret);

      const { issueKey, issueId, url, title, description, projectKey, projectType } = req.body;

      if (!issueKey || !issueId || !url || !title) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // プロジェクトタイプを決定
      // 1. リクエストにprojectTypeが含まれている場合はそれを使用
      // 2. それ以外の場合はprojectKeyからマッピングを検索
      // 3. どちらもない場合はエラー
      let targetProjectType: string | undefined = projectType;

      if (!targetProjectType && projectKey) {
        targetProjectType = BACKLOG_PROJECT_KEY_MAP[projectKey];
      }

      if (!targetProjectType) {
        res.status(400).json({
          error: 'Project type is required. Either provide projectType in request body or configure BACKLOG_PROJECT_KEY_MAP.',
        });
        return;
      }

      // プロジェクトタイプが有効か確認
      if (!PROJECT_TYPES.includes(targetProjectType as any)) {
        res.status(400).json({
          error: `Invalid project type: ${targetProjectType}. Valid types are: ${PROJECT_TYPES.join(', ')}`,
        });
        return;
      }

      // 既存タスクを検索（idempotent upsert）
      const tasksSnapshot = await db
        .collection('projects')
        .doc(targetProjectType)
        .collection('tasks')
        .where('external.issueKey', '==', issueKey)
        .limit(1)
        .get();

      const taskData = {
        external: {
          source: 'backlog' as const,
          issueId,
          issueKey,
          url,
          lastSyncedAt: new Date(),
          syncStatus: 'ok' as const,
        },
        title,
        description: description || '',
        flowStatus: '未着手' as const,
        assigneeIds: [],
        itUpDate: null,
        releaseDate: null,
        kubunLabelId: '', // デフォルトラベルIDが必要
        order: Date.now(),
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // projectTypeを追加
      const taskDataWithProjectType = {
        ...taskData,
        projectType: targetProjectType,
      };

      if (tasksSnapshot.empty) {
        // 新規作成
        await db.collection('projects').doc(targetProjectType).collection('tasks').add(taskDataWithProjectType);
      } else {
        // 更新（外部情報のみ）
        const taskId = tasksSnapshot.docs[0].id;
        await db.collection('projects').doc(targetProjectType).collection('tasks').doc(taskId).update({
          external: taskData.external,
          title: taskData.title,
          description: taskData.description,
          projectType: targetProjectType,
          updatedAt: new Date(),
        });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Sync backlog error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
