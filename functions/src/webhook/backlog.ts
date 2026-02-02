import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { PROJECT_TYPES, ProjectType } from '../reports/projectTypes';
import { getCustomFieldConfig } from '../config/backlogCustomFields';

const db = getFirestore();

// Backlog webhookペイロードの型定義
interface BacklogCustomField {
  id: number;
  field: string;
  // Backlogの日付型カスタムフィールドはオブジェクト形式で返ることがある
  // 例: { name: "2026/01/23" }
  value: string | { name?: string; value?: string } | null;
  fieldTypeId: number;
}

interface BacklogWebhookContent {
  id?: number;
  key_id?: number;
  key?: string;
  issueKey?: string;
  summary?: string;
  title?: string;
  description?: string;
  customFields?: BacklogCustomField[];
}

interface BacklogWebhookProject {
  projectKey?: string;
}

interface BacklogWebhookPayload {
  content?: BacklogWebhookContent;
  project?: BacklogWebhookProject;
  issue?: {
    id?: number;
    key?: string;
    issueKey?: string;
    summary?: string;
    title?: string;
    description?: string;
    customFields?: BacklogCustomField[];
  };
  // フォールバック用
  id?: number;
  key?: string;
  issueKey?: string;
  issueId?: number;
  summary?: string;
  title?: string;
  description?: string;
}

// =====================================
// types/index.ts の型定義を複製
// Cloud Functions環境では @/ エイリアスが使用できないため
// =====================================

// タスクの外部連携情報の型（types/index.ts TaskExternal と同一）
interface TaskExternal {
  source: 'backlog';
  issueId: string;
  issueKey: string;
  url: string;
  lastSyncedAt: Date;
  syncStatus: 'ok' | 'failed';
}

// FlowStatus型（types/index.ts FlowStatus と同一）
type FlowStatus =
  | '未着手'
  | 'ディレクション'
  | 'コーディング'
  | 'デザイン'
  | '待ち'
  | '対応中'
  | '週次報告'
  | '月次報告'
  | '完了';

// Priority型（types/index.ts Priority と同一）
type Priority = 'low' | 'medium' | 'high' | 'urgent';

// =====================================
// タスクデータの型定義
// utils/schemas.ts taskSchema に準拠
// =====================================

// Firestoreに保存するタスクデータの型（新規作成用）
// types/index.ts Task から id を除いた構造
interface TaskCreateData {
  projectType: ProjectType;
  external?: TaskExternal;
  title: string;
  description?: string;
  flowStatus: FlowStatus;
  assigneeIds: string[];
  itUpDate: Date | null;
  releaseDate: Date | null;
  kubunLabelId: string;
  googleDriveUrl?: string | null;
  fireIssueUrl?: string | null;
  googleChatThreadUrl?: string | null;
  backlogUrl?: string | null;
  dueDate?: Date | null;
  priority?: Priority | null;
  order: number;
  over3Reason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

// Firestoreに保存するタスクデータの型（更新用）
interface TaskUpdateData {
  external: TaskExternal;
  title: string;
  description?: string;
  projectType: ProjectType;
  itUpDate?: Date | null;
  releaseDate?: Date | null;
  updatedAt: Date;
}

/**
 * 日付文字列（YYYY/MM/DD形式）をDateオブジェクトに変換する
 * @param dateString 日付文字列（例: "2026/01/23"）
 * @returns Dateオブジェクト、またはパースに失敗した場合はnull
 */
function parseDateString(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  // 文字列以外が渡された場合はnullを返す
  if (typeof dateString !== 'string') {
    console.warn(`parseDateString: Expected string but received ${typeof dateString}`, dateString);
    return null;
  }

  // YYYY/MM/DD または YYYY-MM-DD 形式に対応
  const datePattern = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;
  const match = dateString.match(datePattern);

  if (!match) {
    console.warn(`Invalid date format: ${dateString}`);
    return null;
  }

  const [, year, month, day] = match;
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  const dayNum = parseInt(day);

  // 月と日の範囲を検証
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    console.warn(`Invalid date range: ${dateString}`);
    return null;
  }

  const date = new Date(yearNum, monthNum - 1, dayNum);

  // 有効な日付かチェック
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date: ${dateString}`);
    return null;
  }

  // Date コンストラクタの自動調整を検出
  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() !== monthNum - 1 ||
    date.getDate() !== dayNum
  ) {
    console.warn(`Date auto-adjusted from input: ${dateString}`);
    return null;
  }

  return date;
}

/**
 * カスタムフィールド配列から指定されたIDのフィールド値を取得する
 * Backlogの日付型カスタムフィールドはオブジェクト形式（例: {name: "2026/01/23"}）で返る場合がある
 * @param customFields カスタムフィールド配列
 * @param fieldId フィールドID
 * @returns フィールド値（文字列形式で返す、存在しない場合はnull）
 */
function getCustomFieldValue(
  customFields: BacklogCustomField[] | undefined,
  fieldId: number
): string | null {
  if (!customFields || !Array.isArray(customFields)) return null;

  const field = customFields.find((f) => f.id === fieldId);
  if (!field) return null;

  const value = field.value;

  // 値がnullまたはundefinedの場合
  if (value == null) return null;

  // 値が文字列の場合はそのまま返す
  if (typeof value === 'string') return value;

  // 値がオブジェクトの場合（Backlog日付型: {name: "2026/01/23"}）
  if (typeof value === 'object' && value !== null) {
    // name プロパティを優先的に取得
    const objValue = value as { name?: string; value?: string };
    if (objValue.name && typeof objValue.name === 'string') {
      return objValue.name;
    }
    if (objValue.value && typeof objValue.value === 'string') {
      return objValue.value;
    }
    console.warn(`getCustomFieldValue: Unexpected object value for field ${fieldId}`, value);
    return null;
  }

  console.warn(
    `getCustomFieldValue: Unexpected value type for field ${fieldId}`,
    typeof value,
    value
  );
  return null;
}

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
      const body = req.body as BacklogWebhookPayload;

      // デバッグログ（本番ではDEBUGレベルに変更を推奨）
      // センシティブな情報をマスキングしてログ出力
      const isDevelopment = process.env.NODE_ENV !== 'production';
      if (isDevelopment) {
        console.debug('Backlog Webhook received:', {
          method: req.method,
          contentType: req.headers['content-type'],
          bodyKeys: Object.keys(body),
          hasContent: !!body.content,
          hasProject: !!body.project,
        });
      }

      // Backlog Webhookの構造に基づいてデータを抽出
      // 構造: { created, project, id, type, content, notifications, createdUser }
      // contentの中に課題情報が含まれる
      let issueKey: string | null = null;
      let issueId: string | null = null;
      let title: string | null = null;
      let description: string | undefined = undefined;
      let customFields: BacklogCustomField[] | undefined = undefined;

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
        description = body.content.description || undefined;
        // カスタムフィールドを取得
        customFields = body.content.customFields;
      }
      // contentがない場合のフォールバック（既存のパターンも試す）
      else if (body.issue) {
        issueKey = body.issue.key || body.issue.issueKey || null;
        issueId = body.issue.id?.toString() || null;
        title = body.issue.summary || body.issue.title || null;
        description = body.issue.description || undefined;
        customFields = body.issue.customFields;
      } else if (body.key || body.issueKey) {
        issueKey = body.key || body.issueKey || null;
        issueId = body.id?.toString() || body.issueId?.toString() || null;
        title = body.summary || body.title || null;
        description = body.description || undefined;
      } else {
        // すべてのキーをログ出力して確認
        console.info('Body keys:', Object.keys(body));
        issueKey = body.issueKey || null;
        issueId = body.issueId?.toString() || null;
        title = body.title || null;
        description = body.description || undefined;
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

      // プロジェクトに対応するカスタムフィールド設定を取得
      const customFieldConfig = getCustomFieldConfig(projectType as ProjectType);

      // カスタムフィールドからIT予定日と本番リリース予定日を抽出
      const itUpDateValue = customFieldConfig.itUpDate
        ? getCustomFieldValue(customFields, customFieldConfig.itUpDate)
        : null;
      const releaseDateValue = customFieldConfig.releaseDate
        ? getCustomFieldValue(customFields, customFieldConfig.releaseDate)
        : null;
      const itUpDate = parseDateString(itUpDateValue);
      const releaseDate = parseDateString(releaseDateValue);

      // タイトルに課題番号を接頭辞として追加
      // 例: "REG2017-2250 【坂江】ペット保険_テクニカルSEO対応とメンテ情報更新"
      const formattedTitle = `${issueKey} ${title}`;

      // 型安全なタスクデータを作成
      const taskData: TaskCreateData = {
        projectType: projectType as ProjectType,
        external: {
          source: 'backlog',
          issueId: finalIssueId,
          issueKey,
          url,
          lastSyncedAt: new Date(),
          syncStatus: 'ok',
        },
        title: formattedTitle,
        ...(description !== undefined && { description }),
        flowStatus: '未着手',
        assigneeIds: [],
        itUpDate,
        releaseDate,
        kubunLabelId: '', // デフォルトなし
        backlogUrl: url, // バックログURLを設定
        order: Date.now(),
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        // 更新（外部情報と日付情報を含む）
        const taskId = tasksSnapshot.docs[0].id;
        // webhook経由の場合、externalは必ず存在する
        const updateData: TaskUpdateData = {
          external: taskData.external!,
          title: taskData.title,
          ...(description !== undefined && { description }),
          projectType: taskData.projectType,
          itUpDate: taskData.itUpDate,
          releaseDate: taskData.releaseDate,
          updatedAt: new Date(),
        };
        await db
          .collection('projects')
          .doc(projectType)
          .collection('tasks')
          .doc(taskId)
          .update(updateData as unknown as { [key: string]: unknown });

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
