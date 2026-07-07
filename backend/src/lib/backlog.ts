/**
 * Backlog連携ユーティリティ
 */

import { projectTypeEnum } from '../db/schema';

/** project_type enum を唯一のソースとして参照（重複定義しない） */
const PROJECT_TYPES = projectTypeEnum.enumValues;

type ProjectType = (typeof projectTypeEnum.enumValues)[number];

// --- カスタムフィールド設定 ---

interface BacklogCustomFieldConfig {
  itUpDate?: number;
  releaseDate?: number;
}

/**
 * プロジェクトごとの日付カスタム属性ID。
 * 2026年5月のBacklogバージョンアップで全プロジェクトのIDが振り直されたため、
 * ID不一致の場合でも属性名（ＩＴ予定日/本番リリース予定日）+ 日付型で照合するフォールバックがある。
 * IDの確認方法: GET /backlog/api/v2/projects/:projectKey/customFields
 */
const BACKLOG_CUSTOM_FIELDS: Record<ProjectType, BacklogCustomFieldConfig> = {
  REG2017: { itUpDate: 25, releaseDate: 30 },
  BRGREG: { itUpDate: 4, releaseDate: 5 },
  PRREG: { itUpDate: 32, releaseDate: 36 },
  MONO: {},
  MONO_ADMIN: {},
  DES_FIRE: {},
  DesignSystem: {},
  DMREG2: { itUpDate: 16, releaseDate: 15 },
  monosus: {},
  FAQ_IMP: {},
};

export function getCustomFieldConfig(projectType: string): BacklogCustomFieldConfig {
  return BACKLOG_CUSTOM_FIELDS[projectType as ProjectType] ?? {};
}

/**
 * 課題更新 Webhook の changes 配列でカスタムフィールドを特定するための属性名。
 * Backlog の changes は field をカスタム属性名で表す場合と
 * `customField_<ID>` / ID 文字列で表す場合があるため、名前候補も併せて照合する。
 */
export const IT_UP_DATE_FIELD_NAMES = ['ＩＴ予定日', 'IT予定日'] as const;
export const RELEASE_DATE_FIELD_NAMES = ['本番リリース予定日', 'リリース予定日'] as const;

// --- Webhook ペイロード型 ---

export interface BacklogCustomField {
  id: number;
  field?: string;
  /** カスタム属性名（例: "ＩＴ予定日"） */
  name?: string;
  value: string | { name?: string; value?: string } | null;
  fieldTypeId: number;
}

/** Backlogカスタム属性の日付型を表す fieldTypeId */
const FIELD_TYPE_DATE = 4;

/** 課題更新 Webhook の content.changes の1エントリ */
export interface BacklogChange {
  field?: string;
  new_value?: string | null;
  old_value?: string | null;
  type?: string;
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
    changes?: BacklogChange[];
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
 * 日付文字列をDateに変換
 * 対応形式: YYYY/MM/DD、YYYY-MM-DD、ISO日時（例: 2026-07-15T00:00:00Z ※日付部分のみ使用）
 */
export function parseDateString(dateString: string | null | undefined): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;

  // ISO日時形式は日付部分のみを対象にする（Backlog VUP後の日付属性はこの形式で届く）
  const datePart = dateString.split('T')[0];
  const match = datePart.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
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
 * Webhook から取れた日付文字列を3値に解決する
 *
 * 空値（null / 空文字）はクリア（null）を意味する。
 * パース不能な非空文字列は形式不明の情報として信用せず undefined（既存値維持）にする
 * （更新イベントで想定外の日付形式が来た場合に既存日付を消さないため）
 */
function parseDateValue(value: string | null): Date | null | undefined {
  if (value == null || value === '') return null;
  return parseDateString(value) ?? undefined;
}

/** カスタムフィールド1件から値を取り出す */
function extractCustomFieldValue(field: BacklogCustomField): string | null {
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
 * 課題更新 Webhook の changes 配列からカスタムフィールドの変更後の値を取得する
 *
 * @returns 対象フィールドの変更エントリが無い（または new_value が欠落している）場合は
 *          undefined（＝情報なし）、変更がある場合は new_value（クリア時は空文字）
 */
export function getChangedCustomFieldValue(
  changes: BacklogChange[] | undefined,
  fieldId: number,
  fieldNames: readonly string[]
): string | null | undefined {
  if (!Array.isArray(changes)) return undefined;

  // TODO: 実ペイロードで field の表記が確定したら候補を絞る（route側の unmatched ログで確認可能）
  // 裸のID文字列は候補にしない: 新BacklogのIDは小さい整数（"25"等）で誤マッチのリスクがある
  const candidates = new Set<string>([`customField_${fieldId}`, ...fieldNames]);
  const change = changes.find((c) => c.field != null && candidates.has(String(c.field).trim()));
  if (!change) return undefined;

  if (typeof change.new_value === 'string') return change.new_value;
  // new_value: null は明示的なクリア、キー自体の欠落は情報なし扱い
  return change.new_value === null ? '' : undefined;
}

/**
 * Webhook ペイロードから日付カスタムフィールドの更新値を解決する
 *
 * 課題追加イベントは customFields に全フィールドが入るが、
 * 課題更新イベントは changes に変更差分しか入らない。
 *
 * @returns undefined = ペイロードに情報なし or パース不能（既存値を維持すべき）、
 *          null = クリアされた、Date = 設定された
 */
export function resolveCustomDateField(
  customFields: BacklogCustomField[] | undefined,
  changes: BacklogChange[] | undefined,
  fieldId: number | undefined,
  fieldNames: readonly string[]
): Date | null | undefined {
  if (!fieldId) return undefined;

  if (Array.isArray(customFields)) {
    // 属性名 + 日付型での照合を優先し、name が無いペイロードでは ID で照合
    // （BacklogのバージョンアップでIDが振り直し・再割当されても名前で正しく追従できるようにする）
    const field =
      customFields.find(
        (f) =>
          f.fieldTypeId === FIELD_TYPE_DATE &&
          typeof f.name === 'string' &&
          fieldNames.includes(f.name.trim())
      ) ?? customFields.find((f) => f.id === fieldId);
    if (field) return parseDateValue(extractCustomFieldValue(field));
  }

  const changedValue = getChangedCustomFieldValue(changes, fieldId, fieldNames);
  if (changedValue === undefined) return undefined;
  return parseDateValue(changedValue);
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
  changes: BacklogChange[] | undefined;
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
      changes: body.content.changes,
    };
  }

  if (body.issue) {
    return {
      issueKey: body.issue.key || body.issue.issueKey || null,
      issueId: body.issue.id?.toString() || null,
      title: body.issue.summary || body.issue.title || null,
      description: body.issue.description || undefined,
      customFields: body.issue.customFields,
      changes: undefined,
    };
  }

  return {
    issueKey: body.key || body.issueKey || null,
    issueId: body.id?.toString() || body.issueId?.toString() || null,
    title: body.summary || body.title || null,
    description: body.description || undefined,
    customFields: undefined,
    changes: undefined,
  };
}
