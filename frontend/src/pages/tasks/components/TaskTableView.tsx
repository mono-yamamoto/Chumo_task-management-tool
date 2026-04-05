import { Fragment } from 'react';
import type { Task } from '../../../types';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';

interface TaskTableViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  enableInfoBg?: boolean;
  pinnedTaskIds?: Set<string>;
  onTogglePin?: (taskId: string, isPinned: boolean) => void;
}

export function TaskTableView({
  tasks,
  onTaskClick,
  enableInfoBg,
  pinnedTaskIds,
  onTogglePin,
}: TaskTableViewProps) {
  // ピン済みタスクの最後のインデックスを特定（セパレーター挿入位置）
  // tasks は DashboardPage 側で「タイマー > ピン > 通常」にソート済み
  let lastPinnedIndex = -1;
  if (pinnedTaskIds && pinnedTaskIds.size > 0) {
    for (let i = tasks.length - 1; i >= 0; i--) {
      if (pinnedTaskIds.has(tasks[i]!.id)) {
        lastPinnedIndex = i;
        break;
      }
    }
  }
  const hasSeparator = lastPinnedIndex >= 0 && lastPinnedIndex < tasks.length - 1;

  return (
    <div
      className="overflow-hidden rounded-lg border border-border-default bg-bg-primary"
      role="table"
    >
      <TaskTableHeader />
      <div role="rowgroup">
        {tasks.map((task, i) => (
          <Fragment key={task.id}>
            <TaskTableRow
              task={task}
              onClick={onTaskClick}
              enableInfoBg={enableInfoBg}
              isPinned={pinnedTaskIds?.has(task.id)}
              onTogglePin={onTogglePin}
            />
            {hasSeparator && i === lastPinnedIndex && (
              <div
                className="h-[2px] bg-border-default"
                role="separator"
                aria-label="ピン留めタスクと通常タスクの境界"
              />
            )}
          </Fragment>
        ))}
        {tasks.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">タスクがありません</div>
        )}
      </div>
    </div>
  );
}
