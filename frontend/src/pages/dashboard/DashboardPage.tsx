import { useMemo } from 'react';
import { Search, Bell } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { IconButton } from '../../components/ui/IconButton';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { StatsRow } from './StatsRow';
import { TaskToolbar } from './TaskToolbar';
import { TaskTableView } from './TaskTableView';
import { TaskCardView } from './TaskCardView';
import { useViewMode } from '../../hooks/useViewMode';
import { useTaskDrawer } from '../../hooks/useTaskDrawer';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { getMyTasks } from '../../lib/mockData';
import type { Task } from '../../types';

export function DashboardPage() {
  const myTasks = useMemo(() => getMyTasks(), []);
  const activeTasks = useMemo(() => myTasks.filter((t) => t.flowStatus !== '完了'), [myTasks]);
  const stats = useDashboardStats(myTasks);
  const { viewMode, setViewMode } = useViewMode();
  const { selectedTaskId, isOpen, openDrawer, closeDrawer } = useTaskDrawer();

  const selectedTask = useMemo<Task | null>(
    () => myTasks.find((t) => t.id === selectedTaskId) ?? null,
    [myTasks, selectedTaskId]
  );

  const handleTaskClick = (task: Task) => {
    openDrawer(task.id);
  };

  return (
    <>
      <Header title="ダッシュボード">
        <Input placeholder="タスクを検索..." icon={<Search size={16} />} className="w-[220px]" />
        <div className="relative">
          <IconButton aria-label="通知" className="h-9 w-9 rounded-md border border-border-default">
            <Bell size={18} />
          </IconButton>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <StatsRow
          active={stats.active}
          dueSoon={stats.dueSoon}
          overdue={stats.overdue}
          done={stats.done}
        />

        <TaskToolbar
          taskCount={activeTasks.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {viewMode === 'table' ? (
          <TaskTableView tasks={activeTasks} onTaskClick={handleTaskClick} />
        ) : (
          <TaskCardView tasks={activeTasks} onTaskClick={handleTaskClick} />
        )}
      </div>

      <TaskDrawer task={selectedTask} isOpen={isOpen} onClose={closeDrawer} />
    </>
  );
}
