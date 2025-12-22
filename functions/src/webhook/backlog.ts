import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { PROJECT_TYPES } from '../reports/projectTypes';

const db = getFirestore();

// utils/backlog.tsからgenerateBacklogUrlをインポートできないため、
// 同じ実装を保持（Cloud Functions環境ではutilsディレクトリにアクセスできない）

/**
 * 課題番号からプロジェクトタイプを抽出する
 * 例: "BRGREG-2905" → "BRGREG"
 * 例: "REG2017-2229" → "REG2017"
 *
 * @param issueKey 課題番号
 * @returns プロジェクトタイプ（見つからない場合はnull）
 */
function extractProjectTypeFromIssueKey(issueKey: string): string | null {
  if (!issueKey) return null;

  // 課題番号のパターンからプロジェクト名を抽出
  // 例: BRGREG-2905 → BRGREG, REG2017-2229 → REG2017
  const issueKeyPattern = /^([A-Z0-9_]+)-\d+/;
  const match = issueKey.match(issueKeyPattern);

  if (!match) return null;

  const projectName = match[1];

  // PROJECT_TYPESに一致するか確認
  if ((PROJECT_TYPES as readonly string[]).includes(projectName)) {
    return projectName;
  }

  return null;
}

/**
 * 課題番号からバックログURLを生成する
 *
 * @param issueKey 課題番号（例: "BRGREG-2905", "REG2017-2229"）
 * @returns バックログURL
 */
function generateBacklogUrl(issueKey: string): string {
  const baseUrl = 'https://ss-pj.jp/backlog/view';
  return `${baseUrl}/${issueKey}`;
}

export const webhookBacklog = onRequest(
  {
    cors: true,
    maxInstances: 10,
    region: 'asia-northeast1',
  },
  async (req, res) => {
    // CORSヘッダーを設定
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONSリクエスト（preflight）に対応
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // デバッグログ（本番ではDEBUGレベルに変更を推奨）
      // センシティブな情報をマスキングしてログ出力
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (isDevelopment) {
        console.debug('Backlog Webhook received:', {
          method: req.method,
          contentType: req.headers['content-type'],
          bodyKeys: Object.keys(req.body || {}),
          hasContent: !!req.body?.content,
          hasProject: !!req.body?.project,
        });
      }

      const body = req.body;

      // Backlog Webhookの構造に基づいてデータを抽出
      // 構造: { created, project, id, type, content, notifications, createdUser }
      // contentの中に課題情報が含まれる
      let issueKey: string | null = null;
      let issueId: string | null = null;
      let title: string | null = null;
      let description: string | null = null;

      // contentから課題情報を取得
      if (body.content) {
        // 課題番号は {projectKey}-{key_id} の形式で生成
        // 例: project.projectKey = "TEST", content.key_id = 100 → "TEST-100"
        if (body.project?.projectKey && body.content.key_id) {
          issueKey = `${body.project.projectKey}-${body.content.key_id}`;
        } else {
          // フォールバック: content.key または content.issueKey から直接取得
          issueKey = body.content.key || body.content.issueKey || null;
        }
        // content.id から課題IDを取得
        issueId = body.content.id?.toString() || null;
        // content.summary からタイトルを取得
        title = body.content.summary || body.content.title || null;
        // content.description から説明を取得
        description = body.content.description || null;
      }
      // contentがない場合のフォールバック（既存のパターンも試す）
      else if (body.issue) {
        issueKey = body.issue.key || body.issue.issueKey || null;
        issueId = body.issue.id?.toString() || body.issue.issueId?.toString() || null;
        title = body.issue.summary || body.issue.title || null;
        description = body.issue.description || null;
      } else if (body.key || body.issueKey) {
        issueKey = body.key || body.issueKey || null;
        issueId = body.id?.toString() || body.issueId?.toString() || null;
        title = body.summary || body.title || null;
        description = body.description || null;
      } else {
        // すべてのキーをログ出力して確認
        console.info('Body keys:', Object.keys(body));
        issueKey = body.issueKey || null;
        issueId = body.issueId?.toString() || null;
        title = body.title || null;
        description = body.description || null;
      }

      // 課題番号が必須
      if (!issueKey) {
        console.error('Missing issueKey in webhook payload');
        // デバッグ用にログに記録（レスポンスには含めない）
        console.debug('Received body:', body);
        res.status(400).json({
          error: 'Missing issueKey in webhook payload',
        });
        return;
      }

      // 課題番号からプロジェクトタイプを抽出
      const projectType = extractProjectTypeFromIssueKey(issueKey);
      if (!projectType) {
        console.error(`Could not extract project type from issueKey: ${issueKey}`);
        res.status(400).json({
          error: `Could not extract project type from issueKey: ${issueKey}. Valid project types are: ${PROJECT_TYPES.join(', ')}`,
        });
        return;
      }

      // タイトルが必須
      if (!title) {
        console.error('Missing title in webhook payload');
        // デバッグ用にログに記録（レスポンスには含めない）
        console.debug('Received body:', body);
        res.status(400).json({
          error: 'Missing title in webhook payload',
        });
        return;
      }

      // バックログURLを生成
      const url = generateBacklogUrl(issueKey);

      // issueIdが取得できない場合は、issueKeyをそのまま使用
      const finalIssueId = issueId || issueKey;

      // 既存タスクを検索（idempotent upsert）
      const tasksSnapshot = await db
        .collection('projects')
        .doc(projectType)
        .collection('tasks')
        .where('external.issueKey', '==', issueKey)
        .limit(1)
        .get();

      const taskData = {
        external: {
          source: 'backlog' as const,
          issueId: finalIssueId,
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
        kubunLabelId: '', // デフォルトなし
        order: Date.now(),
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        projectType,
      };

      if (tasksSnapshot.empty) {
        // 新規作成
        const taskRef = await db
          .collection('projects')
          .doc(projectType)
          .collection('tasks')
          .add(taskData);

        console.info(`Created new task: ${taskRef.id} for issueKey: ${issueKey}`);
        res.status(200).json({
          success: true,
          taskId: taskRef.id,
          projectType,
          issueKey,
        });
      } else {
        // 更新（外部情報のみ）
        const taskId = tasksSnapshot.docs[0].id;
        await db.collection('projects').doc(projectType).collection('tasks').doc(taskId).update({
          external: taskData.external,
          title: taskData.title,
          description: taskData.description,
          projectType: taskData.projectType,
          updatedAt: new Date(),
        });

        console.info(`Updated existing task: ${taskId} for issueKey: ${issueKey}`);
        res.status(200).json({
          success: true,
          taskId,
          projectType,
          issueKey,
          updated: true,
        });
      }
    } catch (error) {
      console.error('Webhook backlog error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
