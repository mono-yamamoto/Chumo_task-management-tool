import { useMemo } from 'react';
import { Header } from '../../components/layout/Header';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { TaskTableView } from './components/TaskTableView';
import { TaskCardView } from './components/TaskCardView';
import { TaskListToolbar } from './components/TaskListToolbar';
import { TaskFilterPanel } from './components/TaskFilterPanel';
import { Pagination } from '../../components/ui/Pagination';
import { useViewMode } from '../../hooks/useViewMode';
import { useTaskDrawer } from '../../hooks/useTaskDrawer';
import { getAllTasks } from '../../lib/mockData';
import { FLOW_STATUS_COMPLETED } from '../../lib/constants';
import type { Task } from '../../types';

const allTasks = getAllTasks();
const activeTasks = allTasks.filter((t) => t.flowStatus !== FLOW_STATUS_COMPLETED);

// 静的実装: ページネーション用の定数
const TOTAL_ITEMS = 245;
const PER_PAGE = 30;
const CURRENT_PAGE = 1;

export function TaskListPage() {
  const { viewMode, setViewMode } = useViewMode('tasks');
  const { selectedTaskId, openDrawer, closeDrawer } = useTaskDrawer();

  const selectedTask = useMemo<Task | null>(
    () => allTasks.find((t) => t.id === selectedTaskId) ?? null,
    [allTasks, selectedTaskId]
  );

  const handleTaskClick = (task: Task) => {
    openDrawer(task.id);
  };

  return (
    <>
      <Header title="タスク" />

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <TaskListToolbar
          taskCount={activeTasks.length}
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

        {viewMode === 'table' ? (
          <div className="space-y-4">
            <Pagination totalItems={TOTAL_ITEMS} currentPage={CURRENT_PAGE} perPage={PER_PAGE} />
            <TaskTableView tasks={activeTasks} onTaskClick={handleTaskClick} enableInfoBg />
            <Pagination totalItems={TOTAL_ITEMS} currentPage={CURRENT_PAGE} perPage={PER_PAGE} />
          </div>
        ) : (
          <TaskCardView tasks={activeTasks} onTaskClick={handleTaskClick} enableInfoBg />
        )}
      </div>

      <TaskDrawer task={selectedTask} onClose={closeDrawer} />
    </>
  );
}
