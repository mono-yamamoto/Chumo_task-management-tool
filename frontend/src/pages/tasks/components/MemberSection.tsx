import { UserSectionHeader } from '../../../components/shared/UserSectionHeader';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';
import { ROLE_LABELS_TASK_JA } from '../../../lib/roleLabels';
import type { Task, User } from '../../../types';

interface MemberSectionProps {
  member: User;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function MemberSection({ member, tasks, onTaskClick }: MemberSectionProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-bg-primary">
      <UserSectionHeader
        displayName={member.displayName}
        roleLabel={ROLE_LABELS_TASK_JA[member.role]}
        avatarUrl={member.avatarUrl}
        avatarColor={member.avatarColor}
        count={tasks.length}
      />

      {/* テーブル */}
      <TaskTableHeader />
      <div role="rowgroup">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onTaskClick(task)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTaskClick(task);
              }
            }}
            role="row"
            tabIndex={0}
          >
            <TaskTableRow task={task} enableInfoBg />
          </div>
        ))}
      </div>
    </div>
  );
}
