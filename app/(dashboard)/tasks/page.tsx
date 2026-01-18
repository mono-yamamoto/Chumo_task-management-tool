'use client';

import { useState, Suspense, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Task } from '@/types';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useTasks } from '@/hooks/useTasks';
import { useTaskSessions } from '@/hooks/useTaskSessions';
import { useTaskDetailActions } from '@/hooks/useTaskDetailActions';
import { useTaskDetailState } from '@/hooks/useTaskDetailState';
import { useTaskStore, ViewMode } from '@/stores/taskStore';
import { Button as CustomButton } from '@/components/ui/button';
import { queryKeys } from '@/lib/queryKeys';
import { useTasksList } from '@/hooks/useTasksList';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { useTaskPagination } from '@/hooks/useTaskPagination';
import { useTaskDelete } from '@/hooks/useTaskDelete';
import { useTaskDrawer } from '@/hooks/useTaskDrawer';
import { ProjectType } from '@/constants/projectTypes';
import { Box, Typography, CircularProgress, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import Link from 'next/link';
import { TaskDetailDrawer } from '@/components/Drawer/TaskDetailDrawer';
import { TaskListTable } from '@/components/tasks/TaskListTable';
import { TaskPersonalView } from '@/components/tasks/TaskPersonalView';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { TaskDeleteDialog } from '@/components/tasks/TaskDeleteDialog';

function TasksPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    viewMode,
    setViewMode,
    selectedProjectType,
    setSelectedProjectType,
    selectedTaskId,
    setSelectedTaskId,
    taskFormData,
    setTaskFormData,
    filterStatus,
    setFilterStatus,
    filterAssignee,
    setFilterAssignee,
    filterLabel,
    setFilterLabel,
    filterTimerActive,
    setFilterTimerActive,
    filterItUpDateMonth,
    setFilterItUpDateMonth,
    filterReleaseDateMonth,
    setFilterReleaseDateMonth,
    filterTitle,
    setFilterTitle,
    activeSession,
    setActiveSession,
    resetFilters,
  } = useTaskStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [mountTime] = useState(() => Date.now());

  // タスク一覧を取得（ページネーション対応）
  const tasksQuery = useTasks(selectedProjectType);
  const tasks = useMemo<Task[]>(() => {
    if (!tasksQuery.data) return [];
    return tasksQuery.data.pages.flatMap((page) => page.tasks);
  }, [tasksQuery.data]);

  const isLoading = tasksQuery.isLoading;
  const hasNextPage = 'hasNextPage' in tasksQuery ? tasksQuery.hasNextPage : false;
  const isFetchingNextPage = 'isFetchingNextPage' in tasksQuery ? tasksQuery.isFetchingNextPage : false;
  const fetchNextPage = 'fetchNextPage' in tasksQuery ? tasksQuery.fetchNextPage : undefined;

  // ユーザー・ラベル取得
  const { data: allUsers } = useUsers();
  const { data: allLabels } = useKubunLabels();

  // タスク詳細アクション
  const {
    activeSession: activeSessionValue,
    handleStartTimer,
    handleStopTimer,
    isStoppingTimer,
    handleDriveCreate,
    isCreatingDrive,
    handleFireCreate,
    isCreatingFire,
    handleChatThreadCreate,
    isCreatingChatThread,
    formatDuration,
  } = useTaskDetailActions({
    userId: user?.id,
    queryClient,
    listQueryKeys: [queryKeys.tasks('all')],
    detailQueryKey: (taskId) => queryKeys.task(taskId),
    activeSession,
    setActiveSession,
  });

  // フィルター管理
  const {
    filters,
    handleFilterTitleChange,
    handleFilterStatusChange,
    handleFilterAssigneeChange,
    handleFilterLabelChange,
    handleFilterTimerActiveChange,
    handleFilterItUpDateMonthChange,
    handleFilterReleaseDateMonthChange,
    handleResetFilters,
  } = useTaskFilters({
    filterStatus,
    setFilterStatus,
    filterAssignee,
    setFilterAssignee,
    filterLabel,
    setFilterLabel,
    filterTimerActive,
    setFilterTimerActive,
    filterItUpDateMonth,
    setFilterItUpDateMonth,
    filterReleaseDateMonth,
    setFilterReleaseDateMonth,
    filterTitle,
    setFilterTitle,
    setCurrentPage,
    resetFilters,
  });

  // UseCase経由でフィルタリング・ソート済みタスクを取得
  const { sortedTasks } = useTasksList({
    tasks,
    filters,
    activeTaskId: activeSessionValue?.taskId,
    mountTime,
  });

  // ページネーション管理
  const {
    paginatedTasks,
    canGoPrev,
    canGoNext,
    rangeLabel,
    handlePrevPage,
    handleNextPage,
  } = useTaskPagination({
    sortedTasks,
    currentPage,
    setCurrentPage,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  // タスク詳細選択状態
  const {
    selectedTaskId: selectedTaskIdValue,
    selectedTask,
    taskFormData: taskFormDataValue,
    setTaskFormData: setTaskFormDataValue,
    handleTaskSelect,
    resetSelection,
  } = useTaskDetailState({
    tasks: sortedTasks || [],
    initializeMode: 'if-empty',
    selectedTaskId,
    setSelectedTaskId,
    taskFormData,
    setTaskFormData,
  });

  // Drawer管理
  const { isSavingOnClose, handleDrawerClose } = useTaskDrawer({
    queryClient,
    selectedTask,
    taskFormDataValue,
    resetSelection,
  });

  // 削除管理
  const {
    deleteDialogOpen,
    deleteTaskId,
    deleteConfirmTitle,
    setDeleteConfirmTitle,
    handleDeleteClick,
    handleDeleteTask,
    handleDialogClose,
  } = useTaskDelete({
    tasks,
    selectedTaskIdValue,
    resetSelection,
  });

  // その他の計算
  const taskLabels = useMemo(() => allLabels || [], [allLabels]);
  const kobetsuLabelId = useMemo(() => {
    return allLabels?.find((label) => label.name === '個別')?.id || null;
  }, [allLabels]);

  const selectedTaskProjectType = selectedTask?.projectType ?? null;
  const { data: taskSessions } = useTaskSessions(selectedTaskProjectType, selectedTaskIdValue);

  const shouldRequestMoreData = hasNextPage && sortedTasks.length < currentPage * 30;
  const fallbackEmptyMessage =
    tasks && tasks.length === 0
      ? selectedProjectType === 'all'
        ? 'タスクがありません'
        : 'このプロジェクトにタスクがありません'
      : 'フィルタ条件に一致するタスクがありません';
  const effectiveEmptyMessage =
    paginatedTasks.length === 0 && (shouldRequestMoreData || isFetchingNextPage)
      ? '読み込み中...'
      : fallbackEmptyMessage;

  const handleProjectTypeChange = (value: ProjectType | 'all') => {
    setSelectedProjectType(value);
    setCurrentPage(1);
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
      setCurrentPage(1);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              タスク一覧
            </Typography>
            <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange} size="small">
              <ToggleButton value="table" aria-label="テーブル表示">
                <Tooltip title="テーブル表示">
                  <TableRowsIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="personal" aria-label="個人別表示">
                <Tooltip title="個人別表示">
                  <ViewKanbanIcon />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <CustomButton variant="outline" onClick={handleResetFilters}>
              フィルタリセット
            </CustomButton>
            <Link href="/tasks/new" style={{ textDecoration: 'none' }}>
              <CustomButton>新規作成</CustomButton>
            </Link>
          </Box>
        </Box>

        <TaskFilters
          filterTitle={filterTitle}
          onFilterTitleChange={handleFilterTitleChange}
          selectedProjectType={selectedProjectType}
          onProjectTypeChange={handleProjectTypeChange}
          filterStatus={filterStatus}
          onFilterStatusChange={handleFilterStatusChange}
          filterAssignee={filterAssignee}
          onFilterAssigneeChange={handleFilterAssigneeChange}
          filterLabel={filterLabel}
          onFilterLabelChange={handleFilterLabelChange}
          filterTimerActive={filterTimerActive}
          onFilterTimerActiveChange={handleFilterTimerActiveChange}
          filterItUpDateMonth={filterItUpDateMonth}
          onFilterItUpDateMonthChange={handleFilterItUpDateMonthChange}
          filterReleaseDateMonth={filterReleaseDateMonth}
          onFilterReleaseDateMonthChange={handleFilterReleaseDateMonthChange}
          allUsers={allUsers}
          allLabels={allLabels}
        />

        {viewMode === 'table' ? (
          <>
            <TaskListTable
              tasks={paginatedTasks || []}
              onTaskSelect={handleTaskSelect}
              selectedProjectType={selectedProjectType}
              allUsers={allUsers}
              allLabels={allLabels}
              activeSession={activeSessionValue}
              onStartTimer={handleStartTimer}
              onStopTimer={handleStopTimer}
              isStoppingTimer={isStoppingTimer}
              kobetsuLabelId={kobetsuLabelId}
              currentUserId={user?.id || null}
              emptyMessage={effectiveEmptyMessage}
            />

            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, gap: 2, flexWrap: 'wrap' }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {rangeLabel}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CustomButton variant="outline" onClick={handlePrevPage} disabled={!canGoPrev}>
                  前へ
                </CustomButton>
                <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'center' }}>
                  ページ {currentPage}
                </Typography>
                <CustomButton variant="outline" onClick={handleNextPage} disabled={!canGoNext || isFetchingNextPage}>
                  {isFetchingNextPage ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : '次へ'}
                </CustomButton>
              </Box>
            </Box>
          </>
        ) : (
          <>
            <TaskPersonalView
              tasks={sortedTasks || []}
              onTaskSelect={handleTaskSelect}
              selectedProjectType={selectedProjectType}
              allUsers={allUsers}
              allLabels={allLabels}
              currentUserId={user?.id || null}
              emptyMessage={effectiveEmptyMessage}
            />
            {hasNextPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CustomButton variant="outline" onClick={handleNextPage} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : 'さらに読み込む'}
                </CustomButton>
              </Box>
            )}
          </>
        )}
      </Box>

      <TaskDetailDrawer
        open={!!selectedTaskIdValue && !isSavingOnClose}
        onClose={handleDrawerClose}
        selectedTask={selectedTask}
        taskFormData={taskFormDataValue}
        onTaskFormDataChange={setTaskFormDataValue}
        onDelete={handleDeleteClick}
        isSaving={isSavingOnClose}
        taskLabels={taskLabels}
        allUsers={allUsers}
        activeSession={activeSessionValue}
        onStartTimer={handleStartTimer}
        onStopTimer={handleStopTimer}
        isStoppingTimer={isStoppingTimer}
        onDriveCreate={handleDriveCreate}
        isCreatingDrive={isCreatingDrive}
        onFireCreate={handleFireCreate}
        isCreatingFire={isCreatingFire}
        onChatThreadCreate={handleChatThreadCreate}
        isCreatingChatThread={isCreatingChatThread}
        taskSessions={taskSessions || []}
        currentUserId={user?.id || null}
        formatDuration={formatDuration}
      />

      <TaskDeleteDialog
        open={deleteDialogOpen}
        onClose={handleDialogClose}
        onDelete={handleDeleteTask}
        deleteTaskId={deleteTaskId}
        deleteConfirmTitle={deleteConfirmTitle}
        setDeleteConfirmTitle={setDeleteConfirmTitle}
        tasks={tasks}
      />
    </Box>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
