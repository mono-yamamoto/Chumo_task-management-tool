import { useNavigate } from 'react-router-dom';
import { X, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';

interface DrawerHeaderProps {
  title: string;
  taskId?: string | null;
  onClose: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function DrawerHeader({ title, taskId, onClose, onDelete, isDeleting }: DrawerHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="border-b border-border-default px-6 py-5 space-y-4">
      {/* タイトル + 閉じる */}
      <div className="flex items-start justify-between gap-3">
        {taskId ? (
          <h2
            className="text-lg font-bold leading-normal text-text-primary underline decoration-text-tertiary underline-offset-2 cursor-pointer hover:text-primary-default hover:decoration-primary-default transition-colors"
            onClick={() => navigate(`/tasks/${taskId}`)}
          >
            {title}
          </h2>
        ) : (
          <h2 className="text-lg font-bold leading-normal text-text-primary">{title}</h2>
        )}
        <IconButton onPress={onClose} aria-label="閉じる" className="shrink-0">
          <X size={20} />
        </IconButton>
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
