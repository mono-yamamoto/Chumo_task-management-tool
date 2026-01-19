/**
 * useTaskListPageManager
 *
 * タスク一覧ページ用の複合フック（ファサード）
 * 複数のフックを統合し、ページコンポーネントに必要な全ての状態とアクションを提供
 *
 * 参考パターン: useTaskCommentsManager (hooks/useTaskComments.ts)
 */

import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Task } from '@/types';
import { useTaskStore, ViewMode } from '@/stores/taskStore';
import { queryKeys } from '@/lib/queryKeys';
import { ProjectType } from '@/constants/projectTypes';
import {
  useAuth,
  useUsers,
  useKubunLabels,
  useTasks,
  useTaskSessions,
  useTaskDetailActions,
  useTaskFilters,
  useTasksList,
  useTaskPagination,
  useTaskDetailState,
  useTaskDrawer,
  useTaskDelete,
} from '@/hooks';

export function useTaskListPageManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ============================================
  // Store State
  // ============================================
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

  // ============================================
  // Local State
  // ============================================
  const [currentPage, setCurrentPage] = useState(1);
  const [mountTime] = useState(() => Date.now());

  // ============================================
  // Data Fetching
  // ============================================
  const tasksQuery = useTasks(selectedProjectType);
  const tasks = useMemo<Task[]>(() => {
    if (!tasksQuery.data) return [];
    return tasksQuery.data.pages.flatMap((page) => page.tasks);
  }, [tasksQuery.data]);

  const isLoading = tasksQuery.isLoading;
  const hasNextPage = 'hasNextPage' in tasksQuery ? tasksQuery.hasNextPage : false;
  const isFetchingNextPage = 'isFetchingNextPage' in tasksQuery ? tasksQuery.isFetchingNextPage : false;
  const fetchNextPage = 'fetchNextPage' in tasksQuery ? tasksQuery.fetchNextPage : undefined;

  const { data: allUsers } = useUsers();
  const { data: allLabels } = useKubunLabels();

  // ============================================
  // Task Detail Actions (Timer, Integrations)
  // ============================================
  const taskDetailActions = useTaskDetailActions({
    userId: user?.id,
    queryClient,
    listQueryKeys: [queryKeys.tasks('all')],
    detailQueryKey: (taskId) => queryKeys.task(taskId),
    activeSession,
    setActiveSession,
  });

  // ============================================
  // Filter Management
  // ============================================
  const filterManager = useTaskFilters({
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

  // ============================================
  // Task List (Filtering & Sorting)
  // ============================================
  const { sortedTasks } = useTasksList({
    tasks,
    filters: filterManager.filters,
    activeTaskId: taskDetailActions.activeSession?.taskId,
    mountTime,
  });

  // ============================================
  // Pagination
  // ============================================
  const pagination = useTaskPagination({
    sortedTasks,
    currentPage,
    setCurrentPage,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  // ============================================
  // Task Detail Selection
  // ============================================
  const detailState = useTaskDetailState({
    tasks: sortedTasks || [],
    initializeMode: 'if-empty',
    selectedTaskId,
    setSelectedTaskId,
    taskFormData,
    setTaskFormData,
  });

  // ============================================
  // Drawer Management
  // ============================================
  const drawer = useTaskDrawer({
    queryClient,
    selectedTask: detailState.selectedTask,
    taskFormDataValue: detailState.taskFormData,
    resetSelection: detailState.resetSelection,
  });

  // ============================================
  // Delete Management
  // ============================================
  const deleteManager = useTaskDelete({
    tasks,
    selectedTaskIdValue: detailState.selectedTaskId,
    resetSelection: detailState.resetSelection,
  });

  // ============================================
  // Computed Values
  // ============================================
  const taskLabels = useMemo(() => allLabels || [], [allLabels]);
  const kobetsuLabelId = useMemo(() => {
    return allLabels?.find((label) => label.name === '個別')?.id || null;
  }, [allLabels]);

  const selectedTaskProjectType = detailState.selectedTask?.projectType ?? null;
  const { data: taskSessions } = useTaskSessions(selectedTaskProjectType, detailState.selectedTaskId);

  const shouldRequestMoreData = hasNextPage && sortedTasks.length < currentPage * 30;
  const fallbackEmptyMessage =
    tasks && tasks.length === 0
      ? selectedProjectType === 'all'
        ? 'タスクがありません'
        : 'このプロジェクトにタスクがありません'
      : 'フィルタ条件に一致するタスクがありません';
  const effectiveEmptyMessage =
    pagination.paginatedTasks.length === 0 && (shouldRequestMoreData || isFetchingNextPage)
      ? '読み込み中...'
      : fallbackEmptyMessage;

  // ============================================
  // Handlers
  // ============================================
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

  // ============================================
  // Return
  // ============================================
  return {
    // User
    user,

    // View State
    viewMode,
    handleViewModeChange,

    // Project Type
    selectedProjectType,
    handleProjectTypeChange,

    // Loading State
    isLoading,
    isFetchingNextPage,
    hasNextPage,

    // Data
    tasks,
    sortedTasks,
    allUsers,
    allLabels,
    taskLabels,
    kobetsuLabelId,
    taskSessions: taskSessions || [],

    // Filters
    filters: {
      filterTitle,
      filterStatus,
      filterAssignee,
      filterLabel,
      filterTimerActive,
      filterItUpDateMonth,
      filterReleaseDateMonth,
    },
    filterHandlers: {
      handleFilterTitleChange: filterManager.handleFilterTitleChange,
      handleFilterStatusChange: filterManager.handleFilterStatusChange,
      handleFilterAssigneeChange: filterManager.handleFilterAssigneeChange,
      handleFilterLabelChange: filterManager.handleFilterLabelChange,
      handleFilterTimerActiveChange: filterManager.handleFilterTimerActiveChange,
      handleFilterItUpDateMonthChange: filterManager.handleFilterItUpDateMonthChange,
      handleFilterReleaseDateMonthChange: filterManager.handleFilterReleaseDateMonthChange,
      handleResetFilters: filterManager.handleResetFilters,
    },

    // Pagination
    pagination: {
      currentPage,
      paginatedTasks: pagination.paginatedTasks,
      canGoPrev: pagination.canGoPrev,
      canGoNext: pagination.canGoNext,
      rangeLabel: pagination.rangeLabel,
      handlePrevPage: pagination.handlePrevPage,
      handleNextPage: pagination.handleNextPage,
    },

    // Task Detail
    detail: {
      selectedTaskId: detailState.selectedTaskId,
      selectedTask: detailState.selectedTask,
      taskFormData: detailState.taskFormData,
      setTaskFormData: detailState.setTaskFormData,
      handleTaskSelect: detailState.handleTaskSelect,
      resetSelection: detailState.resetSelection,
    },

    // Drawer
    drawer: {
      isSavingOnClose: drawer.isSavingOnClose,
      handleDrawerClose: drawer.handleDrawerClose,
    },

    // Delete
    deleteDialog: {
      open: deleteManager.deleteDialogOpen,
      deleteTaskId: deleteManager.deleteTaskId,
      confirmTitle: deleteManager.deleteConfirmTitle,
      setConfirmTitle: deleteManager.setDeleteConfirmTitle,
      handleDeleteClick: deleteManager.handleDeleteClick,
      handleDelete: deleteManager.handleDeleteTask,
      handleClose: deleteManager.handleDialogClose,
    },

    // Actions (Timer, Integrations)
    actions: {
      activeSession: taskDetailActions.activeSession,
      handleStartTimer: taskDetailActions.handleStartTimer,
      handleStopTimer: taskDetailActions.handleStopTimer,
      isStoppingTimer: taskDetailActions.isStoppingTimer,
      handleDriveCreate: taskDetailActions.handleDriveCreate,
      isCreatingDrive: taskDetailActions.isCreatingDrive,
      handleFireCreate: taskDetailActions.handleFireCreate,
      isCreatingFire: taskDetailActions.isCreatingFire,
      handleChatThreadCreate: taskDetailActions.handleChatThreadCreate,
      isCreatingChatThread: taskDetailActions.isCreatingChatThread,
      formatDuration: taskDetailActions.formatDuration,
    },

    // Empty Message
    emptyMessage: effectiveEmptyMessage,
  };
}
