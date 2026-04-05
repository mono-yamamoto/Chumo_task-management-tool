import { useMemo } from 'react';
import {
  GridList,
  GridListItem,
  Button,
  useDragAndDrop,
  DropIndicator,
} from 'react-aria-components';
import { GripVertical } from 'lucide-react';
import type { Task, FlowStatus } from '../../../types';
import { FLOW_STATUS_ORDER, FLOW_STATUS_LABELS } from '../../../lib/constants';
import { cn } from '../../../lib/utils';
import { CardSectionHeader } from './CardSectionHeader';
import { TaskCard } from './TaskCard';

interface TaskCardViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  enableInfoBg?: boolean;
  enableDnd?: boolean;
  onReorder?: (
    taskId: string,
    targetId: string,
    dropPosition: 'before' | 'after',
    flowStatus: FlowStatus
  ) => void;
}

export function TaskCardView({
  tasks,
  onTaskClick,
  enableInfoBg,
  enableDnd,
  onReorder,
}: TaskCardViewProps) {
  const columns = useMemo(() => {
    const grouped = new Map<FlowStatus, Task[]>();

    // 初期化（全カラム表示）
    for (const status of FLOW_STATUS_ORDER) {
      grouped.set(status, []);
    }

    // タスクを振り分け
    for (const task of tasks) {
      const existing = grouped.get(task.flowStatus);
      if (existing) {
        existing.push(task);
      }
    }

    // 各カラム内を order 昇順でソート
    for (const [, columnTasks] of grouped) {
      columnTasks.sort((a, b) => a.order - b.order);
    }

    return grouped;
  }, [tasks]);

  // タスクIDからTaskオブジェクトを引くためのマップ
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const handleAction = (key: React.Key) => {
    const task = taskMap.get(String(key));
    if (task) onTaskClick(task);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from(columns.entries()).map(([status, statusTasks]) => (
        <div key={status} className="flex-1 min-w-[200px]">
          <CardSectionHeader label={FLOW_STATUS_LABELS[status]} count={statusTasks.length} />
          <TaskCardColumn
            status={status}
            tasks={statusTasks}
            onAction={handleAction}
            enableInfoBg={enableInfoBg}
            enableDnd={enableDnd}
            onReorder={onReorder}
          />
        </div>
      ))}
    </div>
  );
}

/** FlowStatus カラム内の GridList（D&D対応） */
function TaskCardColumn({
  status,
  tasks,
  onAction,
  enableInfoBg,
  enableDnd,
  onReorder,
}: {
  status: FlowStatus;
  tasks: Task[];
  onAction: (key: React.Key) => void;
  enableInfoBg?: boolean;
  enableDnd?: boolean;
  onReorder?: TaskCardViewProps['onReorder'];
}) {
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ 'text/plain': String(key) })),
    onReorder: (e) => {
      if (!onReorder || e.target.dropPosition === 'on') return;
      const draggedId = String([...e.keys][0]);
      const targetId = String(e.target.key);
      onReorder(draggedId, targetId, e.target.dropPosition, status);
    },
    renderDropIndicator: (target) => (
      <DropIndicator
        target={target}
        className={({ isDropTarget }) =>
          cn(
            'h-0.5 rounded-full transition-colors my-1',
            isDropTarget ? 'bg-primary-default' : 'bg-transparent'
          )
        }
      />
    ),
  });

  return (
    <GridList
      aria-label={`${FLOW_STATUS_LABELS[status]} タスク`}
      items={tasks}
      dragAndDropHooks={enableDnd ? dragAndDropHooks : undefined}
      onAction={onAction}
      className="space-y-2"
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
              className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded text-text-disabled hover:text-text-secondary transition-opacity z-10"
            >
              <GripVertical size={14} />
            </Button>
          )}
          <TaskCard task={task} enableInfoBg={enableInfoBg} />
        </GridListItem>
      )}
    </GridList>
  );
}
