import { useCallback, useMemo, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { TaskDrawer } from '../../components/shared/TaskDrawer/TaskDrawer';
import { StatsRow } from './components/StatsRow';
import { TaskToolbar } from './components/TaskToolbar';
import { TaskFilterPanel } from '../tasks/components/TaskFilterPanel';
import { TaskTableView } from '../tasks/components/TaskTableView';
import { TaskCardView } from '../tasks/components/TaskCardView';
import { Spinner } from '../../components/ui/Spinner';
import { useViewMode } from '../../hooks/useViewMode';
import { useTaskDrawer } from '../../hooks/useTaskDrawer';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { useAssignedTasks } from '../../hooks/useTasks';
import { useActiveSession } from '../../hooks/useTimer';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { usePinnedTaskIds, useTogglePin } from '../../hooks/useTaskPins';
import { useReorderTasks } from '../../hooks/useReorderTasks';
import { calculateNewOrder } from '../../lib/orderUtils';
import { FLOW_STATUS_COMPLETED, applyTaskFilters } from '../../lib/constants';
import type { Task, FlowStatus } from '../../types';

export function DashboardPage() {
  const { data: myTasks = [], isLoading, error } = useAssignedTasks();
  const { data: activeSession } = useActiveSession();
  const [showFilter, setShowFilter] = useState(false);
  const { filters, hasActiveFilters } = useTaskFilters();
  const pinnedTaskIds = usePinnedTaskIds();
  const togglePin = useTogglePin();
  const reorderTasks = useReorderTasks();

  const activeTasks = useMemo(() => {
    const base = myTasks.filter((t) => t.flowStatus !== FLOW_STATUS_COMPLETED);
    const result = applyTaskFilters(base, filters);

    // ソート優先度: (1) アクティブタイマー → (2) ピン留め → (3) 通常
    // 同じ優先度グループ内は order 昇順
    result.sort((a, b) => {
      if (activeSession) {
        if (a.id === activeSession.taskId) return -1;
        if (b.id === activeSession.taskId) return 1;
      }
      const aPinned = pinnedTaskIds.has(a.id);
      const bPinned = pinnedTaskIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.order - b.order;
    });

    return result;
  }, [myTasks, filters, activeSession, pinnedTaskIds]);

  const stats = useDashboardStats(myTasks);
  const { viewMode, setViewMode } = useViewMode('dashboard');
  const { selectedTaskId, openDrawer, closeDrawer } = useTaskDrawer();

  const handleTaskClick = (task: Task) => {
    openDrawer(task.id);
  };

  const handleTogglePin = useCallback(
    (taskId: string, isPinned: boolean) => {
      togglePin.mutate({ taskId, isPinned });
    },
    [togglePin]
  );

  // テーブル用: フラットリストで order 計算
  const handleTableReorder = useCallback(
    (taskId: string, targetId: string, dropPosition: 'before' | 'after') => {
      const items = activeTasks.map((t) => ({ id: t.id, order: t.order }));
      const newOrder = calculateNewOrder(items, taskId, targetId, dropPosition);
      const task = activeTasks.find((t) => t.id === taskId);
      if (!task) return;
      reorderTasks.mutate([{ taskId, projectType: task.projectType, newOrder }]);
    },
    [activeTasks, reorderTasks]
  );

  // カード用: flowStatus カラム内で order 計算
  const handleCardReorder = useCallback(
    (
      taskId: string,
      targetId: string,
      dropPosition: 'before' | 'after',
      flowStatus: FlowStatus
    ) => {
      const columnTasks = activeTasks
        .filter((t) => t.flowStatus === flowStatus)
        .sort((a, b) => a.order - b.order);
      const items = columnTasks.map((t) => ({ id: t.id, order: t.order }));
      const newOrder = calculateNewOrder(items, taskId, targetId, dropPosition);
      const task = activeTasks.find((t) => t.id === taskId);
      if (!task) return;
      reorderTasks.mutate([{ taskId, projectType: task.projectType, newOrder }]);
    },
    [activeTasks, reorderTasks]
  );

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
              onFilterToggle={() => setShowFilter((prev) => !prev)}
              isFilterActive={hasActiveFilters}
            />

            {showFilter && <TaskFilterPanel />}

            {viewMode === 'table' ? (
              <TaskTableView
                tasks={activeTasks}
                onTaskClick={handleTaskClick}
                pinnedTaskIds={pinnedTaskIds}
                onTogglePin={handleTogglePin}
                enableDnd
                onReorder={handleTableReorder}
              />
            ) : (
              <TaskCardView
                tasks={activeTasks}
                onTaskClick={handleTaskClick}
                enableDnd
                onReorder={handleCardReorder}
              />
            )}
          </>
        )}
      </div>

      <TaskDrawer taskId={selectedTaskId} onClose={closeDrawer} />
    </>
  );
}
