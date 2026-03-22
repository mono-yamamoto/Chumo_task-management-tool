import { Link } from 'react-router-dom';
import { Pin, PlayCircle } from 'lucide-react';
import type { Task } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { AvatarGroup } from '../../../components/ui/AvatarGroup';
import { cn } from '../../../lib/utils';
import { getTaskBgVariant, getTaskBgClass, formatDate } from '../../../lib/taskUtils';
import { FLOW_STATUS_LABELS } from '../../../lib/constants';
import { resolveAssignees, getLabelById } from '../../../lib/mockData';

interface TaskTableRowProps {
  task: Task;
  onClick: (task: Task) => void;
  enableInfoBg?: boolean;
}

export function TaskTableRow({ task, onClick, enableInfoBg }: TaskTableRowProps) {
  const bgVariant = getTaskBgVariant(task, { enableInfoVariant: enableInfoBg });
  const bgClass = getTaskBgClass(bgVariant);
  const label = getLabelById(task.kubunLabelId);

  const assignees = resolveAssignees(task.assigneeIds);

  return (
    <div
      className={cn(
        'flex h-[52px] items-center gap-2 border-b border-border-default px-4 cursor-pointer transition-colors hover:bg-bg-secondary',
        bgClass,
        bgVariant === 'error' && 'border-l-[3px] border-l-error-text',
        bgVariant === 'warning' && 'border-l-[3px] border-l-warning-text',
        bgVariant === 'info' && 'border-l-[3px] border-l-info-text'
      )}
      onClick={() => onClick(task)}
      role="row"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(task);
        }
      }}
    >
      {/* ピン */}
      <div className="w-7 shrink-0 flex items-center justify-center">
        <Pin size={16} className="text-neutral-300" />
      </div>

      {/* タイトル */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <Link
          to={`/tasks/${task.id}`}
          className="truncate text-sm font-bold text-text-primary hover:text-primary-default hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {task.title}
        </Link>
      </div>

      {/* アサイン */}
      <div className="w-[100px] shrink-0">
        <AvatarGroup users={assignees} max={5} size="sm" />
      </div>

      {/* ITアップ/リリース */}
      <div className="w-[96px] shrink-0 flex flex-col gap-0.5">
        <p className="text-sm text-text-secondary">{formatDate(task.itUpDate)}</p>
        <p className="text-sm text-text-tertiary">{formatDate(task.releaseDate)}</p>
      </div>

      {/* 担当（FlowStatus） */}
      <div className="w-[110px] shrink-0">
        <span className="text-sm text-text-secondary">{FLOW_STATUS_LABELS[task.flowStatus]}</span>
      </div>

      {/* 進捗 */}
      <div className="w-[100px] shrink-0">
        {task.progressStatus && <Badge status={task.progressStatus} />}
      </div>

      {/* 区分 */}
      <div className="w-[40px] shrink-0">
        <span className="text-sm text-text-secondary">{label?.name ?? ''}</span>
      </div>

      {/* タイマー */}
      <div className="w-[48px] shrink-0 flex items-center justify-center">
        <PlayCircle size={20} className="text-neutral-400" />
      </div>
    </div>
  );
}
