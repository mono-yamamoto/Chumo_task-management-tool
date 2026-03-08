import { X, Trash2 } from 'lucide-react';

interface DrawerHeaderProps {
  title: string;
  onClose: () => void;
}

export function DrawerHeader({ title, onClose }: DrawerHeaderProps) {
  return (
    <div className="border-b border-border-default px-6 py-5 space-y-4">
      {/* タイトル + 閉じる */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold leading-normal text-text-primary">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-secondary"
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
      </div>

      {/* 削除ボタン */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-error-text transition-colors hover:bg-error-bg"
        >
          <Trash2 size={14} />
          削除
        </button>
      </div>
    </div>
  );
}
