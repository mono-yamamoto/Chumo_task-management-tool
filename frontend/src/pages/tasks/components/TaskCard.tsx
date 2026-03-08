import { Timer } from 'lucide-react';
import type { Task } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { AvatarGroup } from '../../../components/ui/AvatarGroup';
import { cn } from '../../../lib/utils';
import { getTaskBgVariant, getTaskBgClass, formatDate } from '../../../lib/taskUtils';
import { resolveAssignees, getLabelById } from '../../../lib/mockData';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  enableInfoBg?: boolean;
}

export function TaskCard({ task, onClick, enableInfoBg }: TaskCardProps) {
  const bgVariant = getTaskBgVariant(task, { enableInfoVariant: enableInfoBg });
  const bgClass = getTaskBgClass(bgVariant);
  const label = getLabelById(task.kubunLabelId);

  const assignees = resolveAssignees(task.assigneeIds);

  return (
    <div
      className={cn(
        'rounded-md border border-border-default p-3 cursor-pointer transition-colors hover:border-border-strong',
        bgClass || 'bg-bg-primary'
      )}
      onClick={() => onClick(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(task);
        }
      }}
    >
      {/* タイトル（2行clamp） */}
      <p className="text-sm font-medium text-text-primary line-clamp-2 mb-2">{task.title}</p>

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
