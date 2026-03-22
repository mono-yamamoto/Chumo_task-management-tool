import { useMemo } from 'react';
import { Avatar } from '../../../components/ui/Avatar';
import { CardSectionHeader } from './CardSectionHeader';
import { TaskCard } from './TaskCard';
import { FLOW_STATUS_ORDER, FLOW_STATUS_LABELS } from '../../../lib/constants';
import type { Task, User, FlowStatus } from '../../../types';

interface MemberCardSectionProps {
  member: User;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function MemberCardSection({ member, tasks, onTaskClick }: MemberCardSectionProps) {
  const roleLabel = member.role === 'admin' ? 'リーダー' : 'メンバー';

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
      {/* メンバーヘッダー */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar name={member.displayName} />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-text-primary">{member.displayName}</span>
          <span className="text-xs text-text-tertiary">{roleLabel}</span>
        </div>
        <div className="flex-1" />
        <span className="inline-flex items-center rounded-full bg-bg-brand-subtle px-2 py-0.5 text-xs font-medium text-primary-default">
          {tasks.length}件
        </span>
      </div>

      {/* カンバンカラム */}
      <div className="flex gap-3 px-4 pb-4 pt-3">
        {Array.from(columns.entries()).map(([status, statusTasks]) => (
          <div
            key={status}
            className="flex-1 min-w-[160px] rounded-md bg-bg-secondary p-3 space-y-2"
          >
            <CardSectionHeader label={FLOW_STATUS_LABELS[status]} count={statusTasks.length} />
            {statusTasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={onTaskClick} enableInfoBg />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
