import type { ReactNode } from 'react';
import { Avatar } from '../ui/Avatar';

interface UserSectionHeaderProps {
  /** ユーザー名 */
  displayName: string;
  /** ロール等の補助ラベル（例: 'リーダー' / 'パートナー'） */
  roleLabel: string;
  /** アバター画像URL（未指定なら colorName ベースの初期表示） */
  avatarUrl?: string | null;
  avatarColor?: string | null;
  /** 件数バッジに表示する値（数値）。未指定なら非表示 */
  count?: number;
  /** 件数バッジの単位（例: '件' / '人'） */
  countUnit?: string;
  /** 右端に追加表示するノード（合計時間など） */
  rightSlot?: ReactNode;
}

/**
 * メンバー / パートナー一覧で共通利用するセクションヘッダー
 * Avatar + 名前 + ロールラベル + 件数バッジ + 右端スロット
 */
export function UserSectionHeader({
  displayName,
  roleLabel,
  avatarUrl,
  avatarColor,
  count,
  countUnit = '件',
  rightSlot,
}: UserSectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar name={displayName} imageUrl={avatarUrl ?? undefined} colorName={avatarColor} />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-text-primary">{displayName}</span>
        <span className="text-xs text-text-tertiary">{roleLabel}</span>
      </div>
      <div className="flex-1" />
      {count !== undefined && (
        <span className="inline-flex items-center rounded-full bg-bg-brand-subtle px-2 py-0.5 text-xs font-medium text-primary-default">
          {count}
          {countUnit}
        </span>
      )}
      {rightSlot}
    </div>
  );
}
