import { FlowStatus, Priority, ProgressStatus } from '@/types';

/**
 * タスクのステータスオプション
 */
export const FLOW_STATUS_OPTIONS: FlowStatus[] = [
  '未着手',
  'ディレクション',
  'コーディング',
  'デザイン',
  '待ち',
  '対応中',
  '週次報告',
  '月次報告',
  '完了',
];

/**
 * タスクのステータスラベルマッピング
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
 * タスクの進捗ステータスオプション
 */
export const PROGRESS_STATUS_OPTIONS: ProgressStatus[] = [
  '未着手',
  '仕様確認',
  '待ち',
  '調査',
  '見積',
  'CO',
  'ロック解除待ち',
  'デザイン',
  'コーディング',
  '品管チェック',
  'IT連絡済み',
  'ST連絡済み',
  'SENJU登録',
  '親課題',
];

/**
 * タスクの優先度オプション
 */
export const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high', 'urgent'];

/**
 * タスクの優先度ラベルマッピング
 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '緊急',
};
