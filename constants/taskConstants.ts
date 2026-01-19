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

/**
 * 進捗ステータスのカラーマッピング
 * カード表示・テーブル表示で共通使用
 */
export const PROGRESS_STATUS_COLORS: Record<ProgressStatus, string> = {
  未着手: '#6b7280', // グレー
  仕様確認: '#f97316', // オレンジ
  待ち: '#fb923c', // 薄いオレンジ
  調査: '#3b82f6', // 青
  見積: '#8b5cf6', // 紫
  CO: '#ec4899', // ピンク
  ロック解除待ち: '#ef4444', // 赤
  デザイン: '#06b6d4', // シアン
  コーディング: '#1e40af', // ネイビー
  品管チェック: '#84cc16', // ライム
  IT連絡済み: '#22c55e', // 緑
  ST連絡済み: '#14b8a6', // ティール
  SENJU登録: '#10b981', // エメラルド
  親課題: '#374151', // ダークグレー
};
