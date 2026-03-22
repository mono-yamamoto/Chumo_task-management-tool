import { Play, FolderOpen, MessageCircle, Flame, PawPrint, ExternalLink } from 'lucide-react';

export function TaskDetailActionBar() {
  return (
    <div className="flex items-center gap-2 py-2">
      {/* タイマー開始 */}
      <button
        type="button"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary-default px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
        onClick={() => {}} // TODO: タイマー開始処理
      >
        <Play size={16} />
        <span>タイマー開始</span>
      </button>

      {/* 外部サービス連携ボタン群 */}
      <OutlinedActionButton icon={<FolderOpen size={16} />} label="DRIVE作成" />
      <OutlinedActionButton icon={<MessageCircle size={16} />} label="CHAT作成" />
      <OutlinedActionButton icon={<Flame size={16} />} label="FIRE issue作成" />
      <OutlinedActionButton icon={<PawPrint size={16} />} label="PET issue作成" />

      {/* BACKLOG */}
      <button
        type="button"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-teal-200 bg-bg-brand-subtle px-3 py-2 text-xs font-medium text-primary-default transition-colors hover:bg-teal-100"
        onClick={() => {}} // TODO: BACKLOG連携処理
      >
        <ExternalLink size={16} />
        <span>BACKLOGを開く</span>
      </button>
    </div>
  );
}

function OutlinedActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border-default px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
      onClick={() => {}} // TODO: 外部サービス連携処理
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
