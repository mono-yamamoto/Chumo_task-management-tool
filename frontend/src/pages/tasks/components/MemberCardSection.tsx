import { useMemo } from 'react';
import { UserSectionHeader } from '../../../components/shared/UserSectionHeader';
import { CardSectionHeader } from './CardSectionHeader';
import { TaskCard } from './TaskCard';
import { FLOW_STATUS_ORDER, FLOW_STATUS_LABELS } from '../../../lib/constants';
import { ROLE_LABELS_TASK_JA } from '../../../lib/roleLabels';
import type { Task, User, FlowStatus } from '../../../types';

interface MemberCardSectionProps {
  member: User;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function MemberCardSection({ member, tasks, onTaskClick }: MemberCardSectionProps) {
  const columns = useMemo(() => {
    const grouped = new Map<FlowStatus, Task[]>();
    for (const status of FLOW_STATUS_ORDER) {
      grouped.set(status, []);
    }
    for (const task of tasks) {
      const existing = grouped.get(task.flowStatus);
      if (existing) {
        existing.push(task);
      }
    }
    return grouped;
  }, [tasks]);

  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-bg-primary">
      <UserSectionHeader
        displayName={member.displayName}
        roleLabel={ROLE_LABELS_TASK_JA[member.role]}
        avatarUrl={member.avatarUrl}
        avatarColor={member.avatarColor}
        count={tasks.length}
      />

      {/* カンバンカラム */}
      <div className="flex gap-3 px-4 pb-4 pt-3">
        {Array.from(columns.entries()).map(([status, statusTasks]) => (
          <div
            key={status}
            className="flex-1 min-w-[160px] rounded-md bg-bg-secondary p-3 space-y-2"
          >
            <CardSectionHeader label={FLOW_STATUS_LABELS[status]} count={statusTasks.length} />
            {statusTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTaskClick(task);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <TaskCard task={task} enableInfoBg />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
