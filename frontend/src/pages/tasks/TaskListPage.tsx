import { useMemo } from 'react';
import { Header } from '../../components/layout/Header';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { TaskTableView } from './components/TaskTableView';
import { TaskCardView } from './components/TaskCardView';
import { TaskListToolbar } from './components/TaskListToolbar';
import { useViewMode } from '../../hooks/useViewMode';
import { useTaskDrawer } from '../../hooks/useTaskDrawer';
import { getAllTasks } from '../../lib/mockData';
import { FLOW_STATUS_COMPLETED } from '../../lib/constants';
import type { Task } from '../../types';

const allTasks = getAllTasks();
const activeTasks = allTasks.filter((t) => t.flowStatus !== FLOW_STATUS_COMPLETED);

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

        {/* 凡例行 */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-warning-bg px-3 py-1 text-xs font-medium text-warning-text">
            期限1週間以内
          </span>
          <span className="inline-flex items-center rounded-full bg-error-bg px-3 py-1 text-xs font-medium text-error-text">
            期限超過
          </span>
          <span className="inline-flex items-center rounded-full bg-info-bg px-3 py-1 text-xs font-medium text-info-text">
            新着
          </span>
        </div>

        {viewMode === 'table' ? (
          <TaskTableView tasks={activeTasks} onTaskClick={handleTaskClick} enableInfoBg />
        ) : (
          <TaskCardView tasks={activeTasks} onTaskClick={handleTaskClick} enableInfoBg />
        )}
      </div>

      <TaskDrawer task={selectedTask} onClose={closeDrawer} />
    </>
  );
}
