import { useMemo } from 'react';
import type { Task, FlowStatus } from '../../../types';
import { FLOW_STATUS_ORDER, FLOW_STATUS_LABELS } from '../../../lib/constants';
import { CardSectionHeader } from './CardSectionHeader';
import { TaskCard } from './TaskCard';

interface TaskCardViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  enableInfoBg?: boolean;
}

export function TaskCardView({ tasks, onTaskClick, enableInfoBg }: TaskCardViewProps) {
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

    return grouped;
  }, [tasks]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from(columns.entries()).map(([status, statusTasks]) => (
        <div key={status} className="flex-1 min-w-[200px]">
          <CardSectionHeader label={FLOW_STATUS_LABELS[status]} count={statusTasks.length} />
          <div className="space-y-2">
            {statusTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={onTaskClick}
                enableInfoBg={enableInfoBg}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
