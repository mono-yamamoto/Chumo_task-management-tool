import type { Task } from '../types';
import { COMPLETED_PROGRESS_STATUSES, DUE_SOON_THRESHOLD_DAYS } from './constants';

export type TaskBgVariant = 'error' | 'warning' | 'normal';

/**
 * タスクの背景色バリアントを判定する
 *
 * 優先度順:
 * 1. IT日 < 今日（期限超過） → error
 * 2. IT日まで7日以内（期限間近） → warning
 * 3. 上記以外 → normal
 *
 * 除外条件:
 * - フローステータスが「完了」
 * - 進捗が完了・連絡段階（IT連絡済み/ST連絡済み/SENJU登録）
 * - IT日が未設定（null）
 */
export function getTaskBgVariant(task: Task): TaskBgVariant {
  // 完了タスクは背景色なし
  if (task.flowStatus === '完了') return 'normal';

  // 完了・連絡段階の進捗は背景色なし
  if (task.progressStatus && COMPLETED_PROGRESS_STATUSES.includes(task.progressStatus)) {
    return 'normal';
  }

  // IT日未設定は通常
  if (!task.itUpDate) return 'normal';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const itDate = new Date(task.itUpDate);
  itDate.setHours(0, 0, 0, 0);

  // 期限超過
  if (itDate < today) return 'error';

  // 期限間近（7日以内、当日含む）
  const thresholdDate = new Date(today);
  thresholdDate.setDate(thresholdDate.getDate() + DUE_SOON_THRESHOLD_DAYS);
  if (itDate <= thresholdDate) return 'warning';

  return 'normal';
}

/**
 * 背景色バリアントに対応するTailwindクラスを返す
 */
export function getTaskBgClass(variant: TaskBgVariant): string {
  switch (variant) {
    case 'error':
      return 'bg-error-bg';
    case 'warning':
      return 'bg-warning-bg';
    default:
      return '';
  }
}

/**
 * 日付を yyyy-MM-dd 形式にフォーマットする
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 秒数を "Xh Ym Zs" 形式にフォーマットする
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}時間`);
  if (m > 0) parts.push(`${m}分`);
  if (s > 0 || parts.length === 0) parts.push(`${s}秒`);
  return parts.join('');
}
