import { useMemo, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { TaskTableView } from './components/TaskTableView';
import { TaskCardView } from './components/TaskCardView';
import { TaskListToolbar } from './components/TaskListToolbar';
import { TaskFilterPanel } from './components/TaskFilterPanel';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { useViewMode } from '../../hooks/useViewMode';
import { useTaskDrawer } from '../../hooks/useTaskDrawer';
import { useTasks } from '../../hooks/useTasks';
import type { Task } from '../../types';

const PER_PAGE = 30;

export function TaskListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const offset = (currentPage - 1) * PER_PAGE;

  const { data, isLoading, error } = useTasks({
    excludeCompleted: true,
    limit: PER_PAGE,
    offset,
  });

  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);
  const hasMore = data?.hasMore ?? false;

  // hasMore ベースで総件数を推定（正確な totalCount は API に追加が必要）
  const estimatedTotal = hasMore ? offset + PER_PAGE + 1 : offset + tasks.length;

  const { viewMode, setViewMode } = useViewMode('tasks');
  const { selectedTaskId, openDrawer, closeDrawer } = useTaskDrawer();

  const selectedTask = useMemo<Task | null>(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const handleTaskClick = (task: Task) => {
    openDrawer(task.id);
  };

  return (
    <>
      <Header title="タスク" />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <TaskListToolbar
          taskCount={tasks.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <TaskFilterPanel />

        {/* 凡例行 */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-warning-bg px-3 py-1 text-xs font-medium text-warning-text">
            期限1週間以内
          </span>
          <span className="inline-flex items-center rounded-full bg-error-bg px-3 py-1 text-xs font-medium text-error-text">
            期限超過
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-error-border bg-error-bg p-4 text-sm text-error-text">
            タスクの取得に失敗しました: {error.message}
          </div>
        ) : viewMode === 'table' ? (
          <div className="space-y-4">
            <Pagination
              totalItems={estimatedTotal}
              currentPage={currentPage}
              perPage={PER_PAGE}
              onPageChange={setCurrentPage}
            />
            <TaskTableView tasks={tasks} onTaskClick={handleTaskClick} enableInfoBg />
            <Pagination
              totalItems={estimatedTotal}
              currentPage={currentPage}
              perPage={PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : (
          <TaskCardView tasks={tasks} onTaskClick={handleTaskClick} enableInfoBg />
        )}
      </div>

      <TaskDrawer task={selectedTask} onClose={closeDrawer} />
    </>
  );
}
