import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

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

      const { issueKey, issueId, url, title, description, projectKey } = req.body;

      if (!issueKey || !issueId || !url || !title || !projectKey) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // プロジェクトを検索
      const projectsSnapshot = await db
        .collection('projects')
        .where('backlogProjectKey', '==', projectKey)
        .limit(1)
        .get();

      if (projectsSnapshot.empty) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const projectId = projectsSnapshot.docs[0].id;

      // 既存タスクを検索（idempotent upsert）
      const tasksSnapshot = await db
        .collection('projects')
        .doc(projectId)
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

      if (tasksSnapshot.empty) {
        // 新規作成
        await db.collection('projects').doc(projectId).collection('tasks').add(taskData);
      } else {
        // 更新（外部情報のみ）
        const taskId = tasksSnapshot.docs[0].id;
        await db.collection('projects').doc(projectId).collection('tasks').doc(taskId)
          .update({
            external: taskData.external,
            title: taskData.title,
            description: taskData.description,
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
