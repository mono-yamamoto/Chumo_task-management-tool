import { useMemo, useState, useEffect, useCallback } from 'react';
import { Header } from '../../components/layout/Header';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { TaskCreateDrawer } from '../../components/shared/TaskCreateDrawer';
import { TaskTableView } from './components/TaskTableView';
import { TaskCardView } from './components/TaskCardView';
import { TaskListToolbar } from './components/TaskListToolbar';
import { TaskFilterPanel } from './components/TaskFilterPanel';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { useViewMode } from '../../hooks/useViewMode';
import { useTaskDrawer } from '../../hooks/useTaskDrawer';
import { useTasks } from '../../hooks/useTasks';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useReorderTasks } from '../../hooks/useReorderTasks';
import { calculateNewOrder } from '../../lib/orderUtils';
import { applyTaskFilters } from '../../lib/constants';
import type { Task, FlowStatus } from '../../types';

const PER_PAGE = 30;

export function TaskListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const { filters } = useTaskFilters();
  const reorderTasks = useReorderTasks();

  // クライアントサイドフィルタが有効な場合は全件取得
  const hasClientFilters = !!(
    filters.title ||
    (filters.status && filters.status !== '完了以外') ||
    filters.assigneeId ||
    filters.kubunLabelId ||
    filters.itUpMonth ||
    filters.releaseMonth
  );

  const excludeCompleted = !filters.status || filters.status === '完了以外';

  const { data, isLoading, error } = useTasks({
    projectType: filters.projectType || undefined,
    excludeCompleted,
    // クライアントサイドフィルタ時は全件取得
    ...(hasClientFilters
      ? { limit: 9999, offset: 0 }
      : { limit: PER_PAGE, offset: (currentPage - 1) * PER_PAGE }),
  });

  // フィルタ変更時にページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.title,
    filters.projectType,
    filters.status,
    filters.assigneeId,
    filters.kubunLabelId,
    filters.timer,
    filters.itUpMonth,
    filters.releaseMonth,
  ]);

  const filteredTasks = useMemo(
    () => applyTaskFilters(data?.tasks ?? [], filters),
    [data?.tasks, filters]
  );

  // クライアントサイドページング
  const tasks = useMemo(() => {
    if (hasClientFilters) {
      const start = (currentPage - 1) * PER_PAGE;
      return filteredTasks.slice(start, start + PER_PAGE);
    }
    return filteredTasks;
  }, [filteredTasks, currentPage, hasClientFilters]);

  const totalItems = hasClientFilters
    ? filteredTasks.length
    : data?.hasMore
      ? (currentPage - 1) * PER_PAGE + PER_PAGE + 1
      : (currentPage - 1) * PER_PAGE + filteredTasks.length;

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const { viewMode, setViewMode } = useViewMode('tasks');
  const { selectedTaskId, openDrawer, closeDrawer } = useTaskDrawer();

  const handleTaskClick = (task: Task) => {
    openDrawer(task.id);
  };

  // テーブル用: フラットリストで order 計算
  const handleTableReorder = useCallback(
    (taskId: string, targetId: string, dropPosition: 'before' | 'after') => {
      const items = tasks.map((t) => ({ id: t.id, order: t.order }));
      const newOrder = calculateNewOrder(items, taskId, targetId, dropPosition);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      reorderTasks.mutate([{ taskId, projectType: task.projectType, newOrder }]);
    },
    [tasks, reorderTasks]
  );

  // カード用: flowStatus カラム内で order 計算
  const handleCardReorder = useCallback(
    (
      taskId: string,
      targetId: string,
      dropPosition: 'before' | 'after',
      flowStatus: FlowStatus
    ) => {
      const columnTasks = tasks
        .filter((t) => t.flowStatus === flowStatus)
        .sort((a, b) => a.order - b.order);
      const items = columnTasks.map((t) => ({ id: t.id, order: t.order }));
      const newOrder = calculateNewOrder(items, taskId, targetId, dropPosition);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      reorderTasks.mutate([{ taskId, projectType: task.projectType, newOrder }]);
    },
    [tasks, reorderTasks]
  );

  return (
    <>
      <Header title="タスク" />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <TaskListToolbar
          taskCount={hasClientFilters ? filteredTasks.length : tasks.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewTask={() => setIsCreateDrawerOpen(true)}
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
              totalItems={totalItems}
              currentPage={currentPage}
              perPage={PER_PAGE}
              onPageChange={setCurrentPage}
            />
            <TaskTableView
              tasks={tasks}
              onTaskClick={handleTaskClick}
              enableInfoBg
              enableDnd
              onReorder={handleTableReorder}
            />
            <Pagination
              totalItems={totalItems}
              currentPage={currentPage}
              perPage={PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : (
          <TaskCardView
            tasks={tasks}
            onTaskClick={handleTaskClick}
            enableInfoBg
            enableDnd
            onReorder={handleCardReorder}
          />
        )}
      </div>

      <TaskCreateDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        defaultProjectType={filters.projectType || undefined}
      />
      <TaskDrawer taskId={selectedTaskId} onClose={closeDrawer} />
    </>
  );
}
