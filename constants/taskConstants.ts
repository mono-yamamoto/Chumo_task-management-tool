import { FlowStatus, Priority } from '@/types';

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
