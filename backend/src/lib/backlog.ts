/**
 * Backlog連携ユーティリティ
 */

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

type ProjectType = (typeof PROJECT_TYPES)[number];

// --- カスタムフィールド設定 ---

interface BacklogCustomFieldConfig {
  itUpDate?: number;
  releaseDate?: number;
}

const BACKLOG_CUSTOM_FIELDS: Record<ProjectType, BacklogCustomFieldConfig> = {
  REG2017: { itUpDate: 1073783169, releaseDate: 1073783170 },
  BRGREG: { itUpDate: 1073754985, releaseDate: 1073754988 },
  PRREG: { itUpDate: 1073748055, releaseDate: 1073747940 },
  MONO: {},
  MONO_ADMIN: {},
  DES_FIRE: {},
  DesignSystem: {},
  DMREG2: { itUpDate: 1073767877, releaseDate: 1073767878 },
  monosus: {},
};

export function getCustomFieldConfig(projectType: string): BacklogCustomFieldConfig {
  return BACKLOG_CUSTOM_FIELDS[projectType as ProjectType] ?? {};
}

// --- Webhook ペイロード型 ---

export interface BacklogCustomField {
  id: number;
  field?: string;
  value: string | { name?: string; value?: string } | null;
  fieldTypeId: number;
}

export interface BacklogWebhookPayload {
  content?: {
    id?: number;
    key_id?: number;
    key?: string;
    issueKey?: string;
    summary?: string;
    title?: string;
    description?: string;
    customFields?: BacklogCustomField[];
  };
  project?: {
    projectKey?: string;
  };
  issue?: {
    id?: number;
    key?: string;
    issueKey?: string;
    summary?: string;
    title?: string;
    description?: string;
    customFields?: BacklogCustomField[];
  };
  id?: number;
  key?: string;
  issueKey?: string;
  issueId?: number;
  summary?: string;
  title?: string;
  description?: string;
}

// --- ユーティリティ関数 ---

/**
 * 課題番号からプロジェクトタイプを抽出
 * 例: "BRGREG-2905" → "BRGREG"
 */
export function extractProjectTypeFromIssueKey(issueKey: string): string | null {
  if (!issueKey) return null;

  const match = issueKey.match(/^([A-Z0-9_]+)-\d+/);
  if (!match) return null;

  const projectName = match[1];
  if ((PROJECT_TYPES as readonly string[]).includes(projectName)) {
    return projectName;
  }
  return null;
}

/**
 * 課題番号からバックログURLを生成
 */
export function generateBacklogUrl(issueKey: string): string {
  return `https://ss-pj.jp/backlog/view/${issueKey}`;
}

/**
 * 日付文字列（YYYY/MM/DD or YYYY-MM-DD）をDateに変換
 */
export function parseDateString(dateString: string | null | undefined): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;

  const match = dateString.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const y = parseInt(year);
  const m = parseInt(month);
  const d = parseInt(day);

  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;

  // 自動調整チェック（例: 2/30 → 3/2）
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }

  return date;
}

/**
 * カスタムフィールドから値を取得
 */
export function getCustomFieldValue(
  customFields: BacklogCustomField[] | undefined,
  fieldId: number
): string | null {
  if (!customFields || !Array.isArray(customFields)) return null;

  const field = customFields.find((f) => f.id === fieldId);
  if (!field) return null;

  const value = field.value;
  if (value == null) return null;
  if (typeof value === 'string') return value;

  if (typeof value === 'object') {
    if (value.name && typeof value.name === 'string') return value.name;
    if (value.value && typeof value.value === 'string') return value.value;
    return null;
  }

  return null;
}

/**
 * Webhook ペイロードから課題情報を抽出する
 */
export function extractIssueFromPayload(body: BacklogWebhookPayload): {
  issueKey: string | null;
  issueId: string | null;
  title: string | null;
  description: string | undefined;
  customFields: BacklogCustomField[] | undefined;
} {
  if (body.content) {
    let issueKey: string | null = null;
    if (body.project?.projectKey && body.content.key_id) {
      issueKey = `${body.project.projectKey}-${body.content.key_id}`;
    } else {
      issueKey = body.content.key || body.content.issueKey || null;
    }
    return {
      issueKey,
      issueId: body.content.id?.toString() || null,
      title: body.content.summary || body.content.title || null,
      description: body.content.description || undefined,
      customFields: body.content.customFields,
    };
  }

  if (body.issue) {
    return {
      issueKey: body.issue.key || body.issue.issueKey || null,
      issueId: body.issue.id?.toString() || null,
      title: body.issue.summary || body.issue.title || null,
      description: body.issue.description || undefined,
      customFields: body.issue.customFields,
    };
  }

  return {
    issueKey: body.key || body.issueKey || null,
    issueId: body.id?.toString() || body.issueId?.toString() || null,
    title: body.summary || body.title || null,
    description: body.description || undefined,
    customFields: undefined,
  };
}
