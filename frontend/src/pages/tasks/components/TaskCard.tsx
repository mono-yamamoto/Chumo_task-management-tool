import { Link } from 'react-router-dom';
import { Timer } from 'lucide-react';
import type { Task } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { AvatarGroup } from '../../../components/ui/AvatarGroup';
import { cn } from '../../../lib/utils';
import { getTaskBgVariant, getTaskBgClass, formatDate } from '../../../lib/taskUtils';
import { useUsers } from '../../../hooks/useUsers';
import { useLabels } from '../../../hooks/useLabels';

interface TaskCardProps {
  task: Task;
  enableInfoBg?: boolean;
}

export function TaskCard({ task, enableInfoBg }: TaskCardProps) {
  const bgVariant = getTaskBgVariant(task, { enableInfoVariant: enableInfoBg });
  const bgClass = getTaskBgClass(bgVariant);
  const { getUserById } = useUsers();
  const { getLabelById } = useLabels();
  const label = getLabelById(task.kubunLabelId);

  const assignees = task.assigneeIds
    .map((id) => getUserById(id))
    .filter((u): u is NonNullable<typeof u> => u != null);

  return (
    <div
      className={cn(
        'rounded-md border border-border-default p-3 cursor-pointer transition-colors hover:border-border-strong',
        bgClass || 'bg-bg-primary'
      )}
    >
      {/* タイトル（2行clamp） */}
      <Link
        to={`/tasks/${task.id}`}
        className="block text-sm font-medium text-text-primary line-clamp-2 mb-2 hover:text-primary-default hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {task.title}
      </Link>

      {/* アサイン */}
      {assignees.length > 0 && (
        <div className="mb-2">
          <AvatarGroup users={assignees} max={5} size="sm" />
        </div>
      )}

      {/* IT/PR 2行 */}
      <div className="mb-2 space-y-0">
        <p className="text-xs text-text-secondary">
          <span className="inline-block w-6 text-text-tertiary">IT</span>
          {formatDate(task.itUpDate)}
        </p>
        <p className="text-xs text-text-tertiary">
          <span className="inline-block w-6">PR</span>
          {formatDate(task.releaseDate)}
        </p>
      </div>

      {/* 進捗 + 区分 + タイマー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.progressStatus && <Badge status={task.progressStatus} />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">{label?.name ?? ''}</span>
          <Timer size={14} className="text-text-disabled" />
        </div>
      </div>
    </div>
  );
}
