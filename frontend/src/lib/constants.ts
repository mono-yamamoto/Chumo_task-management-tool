import type { FlowStatus, ProgressStatus, Task } from '../types';
import type { TaskFilters } from '../hooks/useTaskFilters';

/**
 * 期限間近の閾値（日数）
 * 運用後の調整を容易にするため定数化
 */
export const DUE_SOON_THRESHOLD_DAYS = 7;

/**
 * 新着タスクの閾値（日数）
 * 未アサイン＋作成からこの日数以内 → 新着（info）扱い
 */
export const NEW_TASK_THRESHOLD_DAYS = 7;

/**
 * 完了ステータス（フィルタリング判定用）
 */
export const FLOW_STATUS_COMPLETED: FlowStatus = '完了';

/**
 * カードビューのFlowStatusカラム表示順序
 */
export const FLOW_STATUS_ORDER: FlowStatus[] = [
  '未着手',
  '待ち',
  'ディレクション',
  'デザイン',
  'コーディング',
];

/**
 * FlowStatusラベル（表示用）
 */
export const FLOW_STATUS_LABELS: Record<FlowStatus, string> = {
  未着手: '未着手',
  ディレクション: 'ディレクション',
  コーディング: 'コーディング',
  デザイン: 'デザイン',
  待ち: '待ち',
  対応中: '対応中',
  週次報告: '週次報告',
  月次報告: '月次報告',
  完了: '完了',
};

/**
 * 進捗バッジカラーマップ
 * ProgressStatus → Tailwind color class
 */
export const PROGRESS_STATUS_COLOR_MAP: Record<ProgressStatus, string> = {
  // 準備・計画段階（Purple 500→900）
  未着手: 'bg-purple-500',
  仕様確認: 'bg-purple-600',
  待ち: 'bg-purple-700',
  調査: 'bg-purple-800',
  見積: 'bg-purple-900',
  // 実作業段階（Pink 500→900）
  CO: 'bg-pink-500',
  ロック解除待ち: 'bg-pink-600',
  デザイン: 'bg-pink-700',
  コーディング: 'bg-pink-800',
  品管チェック: 'bg-pink-900',
  // 完了・連絡段階（Cyan 500→700）
  IT連絡済み: 'bg-cyan-500',
  ST連絡済み: 'bg-cyan-600',
  SENJU登録: 'bg-cyan-700',
  // 特殊
  親課題: 'bg-neutral-600',
};

/**
 * 完了・連絡段階の進捗ステータス
 * この段階のタスクは期限ベースの背景色を適用しない
 */
export const COMPLETED_PROGRESS_STATUSES: ProgressStatus[] = [
  'IT連絡済み',
  'ST連絡済み',
  'SENJU登録',
];

/**
 * FlowStatus Select用オプション
 */
export const FLOW_STATUS_OPTIONS: { value: string; label: string }[] = Object.entries(
  FLOW_STATUS_LABELS
).map(([value, label]) => ({ value, label }));

/**
 * ProgressStatus Select用オプション
 */
export const PROGRESS_STATUS_OPTIONS: { value: string; label: string }[] = Object.keys(
  PROGRESS_STATUS_COLOR_MAP
).map((key) => ({ value: key, label: key }));

/**
 * Date を input[type="date"] の value 形式に変換
 */
export function toDateInputValue(dateValue: Date | string | null | undefined): string {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Date を HH:MM:SS 形式に変換
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/**
 * Date を YYYY-MM-DD HH:MM:SS 形式に変換
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da} ${formatTime(d)}`;
}

/**
 * 月文字列 "YYYY-MM" に Date が含まれるか
 */
export function matchesMonth(date: Date | null, month: string): boolean {
  if (!date || !month) return true;
  const d = new Date(date);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return ym === month;
}

/**
 * TaskFilters をタスク配列に適用するクライアントサイドフィルタ
 */
export function applyTaskFilters(tasks: Task[], filters: TaskFilters): Task[] {
  let result = tasks;

  if (filters.title) {
    const q = filters.title.toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(q));
  }

  if (filters.projectType) {
    result = result.filter((t) => t.projectType === filters.projectType);
  }

  if (filters.status && filters.status !== '完了以外') {
    result = result.filter((t) => t.flowStatus === filters.status);
  }

  if (filters.assigneeId) {
    result = result.filter((t) => t.assigneeIds.includes(filters.assigneeId));
  }

  if (filters.kubunLabelId) {
    result = result.filter((t) => t.kubunLabelId === filters.kubunLabelId);
  }

  if (filters.itUpMonth) {
    result = result.filter((t) => matchesMonth(t.itUpDate, filters.itUpMonth));
  }

  if (filters.releaseMonth) {
    result = result.filter((t) => matchesMonth(t.releaseDate, filters.releaseMonth));
  }

  return result;
}
