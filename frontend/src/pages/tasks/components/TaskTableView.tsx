import { useMemo } from 'react';
import {
  GridList,
  GridListItem,
  Button,
  useDragAndDrop,
  DropIndicator,
} from 'react-aria-components';
import { GripVertical } from 'lucide-react';
import type { Task } from '../../../types';
import { cn } from '../../../lib/utils';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';

interface TaskTableViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  enableInfoBg?: boolean;
  pinnedTaskIds?: Set<string>;
  onTogglePin?: (taskId: string, isPinned: boolean) => void;
  enableDnd?: boolean;
  onReorder?: (taskId: string, targetId: string, dropPosition: 'before' | 'after') => void;
}

export function TaskTableView({
  tasks,
  onTaskClick,
  enableInfoBg,
  pinnedTaskIds,
  onTogglePin,
  enableDnd,
  onReorder,
}: TaskTableViewProps) {
  // タスクIDからTaskオブジェクトを引くためのマップ
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const handleAction = (key: React.Key) => {
    const task = taskMap.get(String(key));
    if (task) onTaskClick(task);
  };

  // ピン留めグループと通常グループに分離
  const hasPins = pinnedTaskIds && pinnedTaskIds.size > 0;
  const { pinnedTasks, regularTasks } = useMemo(() => {
    if (!hasPins) return { pinnedTasks: [] as Task[], regularTasks: tasks };
    const pinned: Task[] = [];
    const regular: Task[] = [];
    for (const task of tasks) {
      if (pinnedTaskIds!.has(task.id)) {
        pinned.push(task);
      } else {
        regular.push(task);
      }
    }
    return { pinnedTasks: pinned, regularTasks: regular };
  }, [tasks, pinnedTaskIds, hasPins]);

  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-bg-primary">
      <TaskTableHeader />

      {hasPins ? (
        <>
          {/* ピン留めグループ */}
          <TaskTableGridList
            tasks={pinnedTasks}
            onAction={handleAction}
            enableInfoBg={enableInfoBg}
            enableDnd={enableDnd}
            onReorder={onReorder}
            pinnedTaskIds={pinnedTaskIds}
            onTogglePin={onTogglePin}
            ariaLabel="ピン留めタスク"
          />
          <div
            className="h-[2px] bg-border-default"
            role="separator"
            aria-label="ピン留めタスクと通常タスクの境界"
          />
          {/* 通常グループ */}
          <TaskTableGridList
            tasks={regularTasks}
            onAction={handleAction}
            enableInfoBg={enableInfoBg}
            enableDnd={enableDnd}
            onReorder={onReorder}
            pinnedTaskIds={pinnedTaskIds}
            onTogglePin={onTogglePin}
            ariaLabel="通常タスク"
          />
        </>
      ) : (
        /* ピンなし: フラットリスト */
        <TaskTableGridList
          tasks={tasks}
          onAction={handleAction}
          enableInfoBg={enableInfoBg}
          enableDnd={enableDnd}
          onReorder={onReorder}
          pinnedTaskIds={pinnedTaskIds}
          onTogglePin={onTogglePin}
          ariaLabel="タスク一覧"
        />
      )}

      {tasks.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-text-tertiary">タスクがありません</div>
      )}
    </div>
  );
}

/** テーブル行の GridList（D&D対応） */
function TaskTableGridList({
  tasks,
  onAction,
  enableInfoBg,
  enableDnd,
  onReorder,
  pinnedTaskIds,
  onTogglePin,
  ariaLabel,
}: {
  tasks: Task[];
  onAction: (key: React.Key) => void;
  enableInfoBg?: boolean;
  enableDnd?: boolean;
  onReorder?: TaskTableViewProps['onReorder'];
  pinnedTaskIds?: Set<string>;
  onTogglePin?: (taskId: string, isPinned: boolean) => void;
  ariaLabel: string;
}) {
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ 'text/plain': String(key) })),
    onReorder: (e) => {
      if (!onReorder || e.target.dropPosition === 'on') return;
      const draggedId = String([...e.keys][0]);
      const targetId = String(e.target.key);
      onReorder(draggedId, targetId, e.target.dropPosition);
    },
    renderDropIndicator: (target) => (
      <DropIndicator
        target={target}
        className={({ isDropTarget }) =>
          cn(
            'h-0.5 rounded-full transition-colors',
            isDropTarget ? 'bg-primary-default' : 'bg-transparent'
          )
        }
      />
    ),
  });

  if (tasks.length === 0) return null;

  return (
    <GridList
      aria-label={ariaLabel}
      items={tasks}
      dragAndDropHooks={enableDnd ? dragAndDropHooks : undefined}
      onAction={onAction}
      renderEmptyState={() => null}
    >
      {(task) => (
        <GridListItem
          key={task.id}
          id={task.id}
          textValue={task.title}
          className="outline-none relative group"
        >
          {enableDnd && (
            <Button
              slot="drag"
              className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded text-text-disabled hover:text-text-secondary transition-opacity z-10"
            >
              <GripVertical size={14} />
            </Button>
          )}
          <TaskTableRow
            task={task}
            enableInfoBg={enableInfoBg}
            isPinned={pinnedTaskIds?.has(task.id)}
            onTogglePin={onTogglePin}
          />
        </GridListItem>
      )}
    </GridList>
  );
}
