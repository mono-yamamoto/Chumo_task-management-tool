import { X, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';

interface DrawerHeaderProps {
  title: string;
  onClose: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function DrawerHeader({ title, onClose, onDelete, isDeleting }: DrawerHeaderProps) {
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
      {onDelete && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs text-error-text hover:bg-error-bg"
            onPress={onDelete}
            isDisabled={isDeleting}
          >
            <Trash2 size={14} />
            {isDeleting ? '削除中...' : '削除'}
          </Button>
        </div>
      )}
    </div>
  );
}
