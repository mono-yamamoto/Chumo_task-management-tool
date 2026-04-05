import { Avatar } from '../../../components/ui/Avatar';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';
import type { Task, User } from '../../../types';

interface MemberSectionProps {
  member: User;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function MemberSection({ member, tasks, onTaskClick }: MemberSectionProps) {
  const roleLabel = member.role === 'admin' ? 'リーダー' : 'メンバー';

  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-bg-primary">
      {/* メンバーヘッダー */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar
          name={member.displayName}
          imageUrl={member.avatarUrl ?? undefined}
          colorName={member.avatarColor}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-text-primary">{member.displayName}</span>
          <span className="text-xs text-text-tertiary">{roleLabel}</span>
        </div>
        <div className="flex-1" />
        <span className="inline-flex items-center rounded-full bg-bg-brand-subtle px-2 py-0.5 text-xs font-medium text-primary-default">
          {tasks.length}件
        </span>
      </div>

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
