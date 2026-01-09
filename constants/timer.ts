/**
 * タイマー関連の定数
 */

/**
 * アクティブセッションのポーリング間隔（ミリ秒）
 * Zustandでグローバル状態を管理しているため、頻繁なポーリングは不要
 */
export const ACTIVE_SESSION_REFETCH_INTERVAL_MS = 15000; // 15秒

/**
 * Zustandのpersistストレージキー名
 */
export const TASK_STORAGE_KEY = 'task-storage';

/**
 * トースト通知のデフォルト表示時間（ミリ秒）
 */
export const DEFAULT_TOAST_DURATION_MS = 5000; // 5秒
