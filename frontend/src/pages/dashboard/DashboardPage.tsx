import { useMemo } from 'react';
import { Header } from '../../components/layout/Header';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { StatsRow } from './components/StatsRow';
import { TaskToolbar } from './components/TaskToolbar';
import { TaskTableView } from '../tasks/components/TaskTableView';
import { TaskCardView } from '../tasks/components/TaskCardView';
import { Spinner } from '../../components/ui/Spinner';
import { useViewMode } from '../../hooks/useViewMode';
import { useTaskDrawer } from '../../hooks/useTaskDrawer';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { useAssignedTasks } from '../../hooks/useTasks';
import { FLOW_STATUS_COMPLETED } from '../../lib/constants';
import type { Task } from '../../types';

export function DashboardPage() {
  const { data: myTasks = [], isLoading, error } = useAssignedTasks();
  const activeTasks = useMemo(
    () => myTasks.filter((t) => t.flowStatus !== FLOW_STATUS_COMPLETED),
    [myTasks]
  );
  const stats = useDashboardStats(myTasks);
  const { viewMode, setViewMode } = useViewMode('dashboard');
  const { selectedTaskId, openDrawer, closeDrawer } = useTaskDrawer();

  const handleTaskClick = (task: Task) => {
    openDrawer(task.id);
  };

  return (
    <>
      <Header title="ダッシュボード" />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <StatsRow
          active={stats.active}
          dueSoon={stats.dueSoon}
          overdue={stats.overdue}
          done={stats.done}
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-error-border bg-error-bg p-4 text-sm text-error-text">
            タスクの取得に失敗しました: {error.message}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      <TaskDrawer taskId={selectedTaskId} onClose={closeDrawer} />
    </>
  );
}
