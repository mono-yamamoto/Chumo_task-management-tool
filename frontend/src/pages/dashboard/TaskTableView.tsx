import type { Task } from '../../types';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';

interface TaskTableViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TaskTableView({ tasks, onTaskClick }: TaskTableViewProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-default" role="table">
      <TaskTableHeader />
      <div role="rowgroup">
        {tasks.map((task) => (
          <TaskTableRow key={task.id} task={task} onClick={onTaskClick} />
        ))}
        {tasks.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">タスクがありません</div>
        )}
      </div>
    </div>
  );
}
