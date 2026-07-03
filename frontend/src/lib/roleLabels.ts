import type { UserRole } from '../types';

/** ロール表示ラベル（日本語・一般用途／設定・サイドバー等） */
export const ROLE_LABELS_JA: Record<UserRole, string> = {
  admin: '管理者',
  member: 'メンバー',
  partner: 'パートナー',
};

/** ロール表示ラベル（日本語・タスク一覧 / レポート列見出し用）
 *  admin を「リーダー」と表記する慣習に合わせる
 */
export const ROLE_LABELS_TASK_JA: Record<UserRole, string> = {
  admin: 'リーダー',
  member: 'メンバー',
  partner: 'パートナー',
};

/** ロール表示ラベル（英語・設定画面のドロップダウン用） */
export const ROLE_LABELS_EN: Record<UserRole, string> = {
  admin: 'Admin',
  member: 'Member',
  partner: 'Partner',
};

/** UserRole の全候補（フォーム選択肢など） */
export const USER_ROLES: readonly UserRole[] = ['admin', 'member', 'partner'];
