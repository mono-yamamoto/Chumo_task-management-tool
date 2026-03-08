import type { FlowStatus, ProgressStatus } from '../types';

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
