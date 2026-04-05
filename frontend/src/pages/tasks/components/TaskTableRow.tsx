import { Pin, Play, Square } from 'lucide-react';
import type { Task } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { AvatarGroup } from '../../../components/ui/AvatarGroup';
import { IconButton } from '../../../components/ui/IconButton';
import { cn } from '../../../lib/utils';
import { getTaskBgVariant, getTaskBgClass, formatDate } from '../../../lib/taskUtils';
import { FLOW_STATUS_LABELS } from '../../../lib/constants';
import { useUsers } from '../../../hooks/useUsers';
import { useLabels } from '../../../hooks/useLabels';
import { useActiveSession, useTimer } from '../../../hooks/useTimer';

interface TaskTableRowProps {
  task: Task;
  enableInfoBg?: boolean;
  isPinned?: boolean;
  onTogglePin?: (taskId: string, isPinned: boolean) => void;
}

export function TaskTableRow({ task, enableInfoBg, isPinned, onTogglePin }: TaskTableRowProps) {
  const bgVariant = getTaskBgVariant(task, { enableInfoVariant: enableInfoBg });
  const bgClass = getTaskBgClass(bgVariant);
  const { getUserById } = useUsers();
  const { getLabelById } = useLabels();
  const label = getLabelById(task.kubunLabelId);
  const { data: activeSession } = useActiveSession();
  const { start, stop } = useTimer();

  const isThisActive = activeSession?.taskId === task.id;
  const isOtherActive = activeSession != null && !isThisActive;

  const assignees = task.assigneeIds
    .map((id) => getUserById(id))
    .filter((u): u is NonNullable<typeof u> => u != null);

  const handleTimerClick = () => {
    if (isThisActive && activeSession) {
      stop.mutate({
        sessionId: activeSession.id,
        projectType: activeSession.projectType ?? task.projectType,
      });
    } else if (!isOtherActive) {
      start.mutate({ taskId: task.id, projectType: task.projectType });
    }
  };

  return (
    <div
      className={cn(
        'flex h-[52px] items-center gap-2 border-b border-border-default px-4 cursor-pointer transition-colors hover:bg-bg-secondary',
        bgClass,
        bgVariant === 'error' && 'border-l-[3px] border-l-error-text',
        bgVariant === 'warning' && 'border-l-[3px] border-l-warning-text',
        bgVariant === 'info' && 'border-l-[3px] border-l-info-text'
      )}
    >
      {/* ピン */}
      <div
        className="w-7 shrink-0 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {onTogglePin ? (
          <IconButton
            aria-label={isPinned ? 'ピン解除' : 'ピン留め'}
            size="sm"
            onPress={() => onTogglePin(task.id, !!isPinned)}
            className={cn(
              'h-7 w-7 rounded-full',
              isPinned
                ? 'text-primary-default hover:bg-bg-brand-subtle'
                : 'text-neutral-300 hover:text-neutral-500 hover:bg-bg-secondary'
            )}
          >
            <Pin size={16} fill={isPinned ? 'currentColor' : 'none'} />
          </IconButton>
        ) : (
          <Pin size={16} className="text-neutral-300" />
        )}
      </div>

      {/* タイトル */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <span className="truncate text-sm font-bold text-text-primary">{task.title}</span>
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
      <div
        className="w-[48px] shrink-0 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          aria-label={isThisActive ? 'タイマー停止' : 'タイマー開始'}
          size="sm"
          isDisabled={isOtherActive || start.isPending || stop.isPending}
          onPress={handleTimerClick}
          className={cn(
            'h-8 w-8 rounded-full',
            isThisActive
              ? 'bg-error-bg text-error-text hover:bg-red-200'
              : 'text-primary-default hover:bg-bg-brand-subtle'
          )}
        >
          {isThisActive ? (
            <Square size={14} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" />
          )}
        </IconButton>
      </div>
    </div>
  );
}
