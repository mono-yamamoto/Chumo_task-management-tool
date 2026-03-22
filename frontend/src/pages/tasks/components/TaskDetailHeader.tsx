import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface TaskDetailHeaderProps {
  taskId: string;
  title: string;
}

export function TaskDetailHeader({ taskId, title }: TaskDetailHeaderProps) {
  return (
    <div className="flex h-14 items-center gap-3">
      <Link
        to="/tasks"
        className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
      >
        <ArrowLeft size={16} />
        <span>タスク一覧</span>
      </Link>

      <span className="text-sm text-text-tertiary">/</span>

      <span className="text-xl font-bold text-text-primary">{taskId}</span>

      <span className="min-w-0 flex-1 truncate text-xl font-bold text-text-primary">{title}</span>
    </div>
  );
}
