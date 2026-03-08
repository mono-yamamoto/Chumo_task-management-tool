import type { ReactNode } from 'react';
import { Play, ExternalLink, Folder, MessageCircle, Flame, PawPrint } from 'lucide-react';

export function DrawerActionBar() {
  return (
    <div className="border-b border-border-default px-6 py-4 space-y-3">
      {/* 詳細ページボタン */}
      <button
        type="button"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary-default text-sm font-medium text-primary-default transition-colors hover:bg-bg-brand-subtle"
      >
        詳細ページ
      </button>

      {/* タイマー開始ボタン */}
      <button
        type="button"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary-default text-sm font-medium text-primary-default transition-colors hover:bg-bg-brand-subtle"
      >
        <Play size={18} />
        タイマー開始
      </button>

      {/* 外部リンクボタングリッド */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <LinkButton icon={<Folder size={16} />} label="DRIVE作成" />
          <LinkButton icon={<MessageCircle size={16} />} label="CHAT作成" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LinkButton icon={<Flame size={16} />} label="FIRE issue作成" />
          <LinkButton icon={<PawPrint size={16} />} label="PET issue作成" />
        </div>
      </div>

      {/* BACKLOGボタン */}
      <button
        type="button"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary-default text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        <ExternalLink size={16} />
        BACKLOGを開く
      </button>
    </div>
  );
}

function LinkButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-border-default text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
    >
      {icon}
      {label}
    </button>
  );
}
