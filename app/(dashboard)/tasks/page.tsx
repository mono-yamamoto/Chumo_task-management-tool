'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FlowStatus, Task } from '@/types';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useTaskSessions } from '@/hooks/useTaskSessions';
import { useTaskDetailActions } from '@/hooks/useTaskDetailActions';
import { useTaskDetailState } from '@/hooks/useTaskDetailState';
import { useTaskStore } from '@/stores/taskStore';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { FLOW_STATUS_OPTIONS, FLOW_STATUS_LABELS } from '@/constants/taskConstants';
import { Button as CustomButton } from '@/components/ui/button';
import { queryKeys } from '@/lib/queryKeys';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Grid,
  Snackbar,
  Alert,
} from '@mui/material';
import Link from 'next/link';
import { TaskDetailDrawer } from '@/components/Drawer/TaskDetailDrawer';
import { TaskListTable } from '@/components/tasks/TaskListTable';
import { TaskSearchForm } from '@/components/tasks/TaskSearchForm';

const TASKS_PER_PAGE = 10;

function TasksPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectType, setDeleteProjectType] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSavingOnClose, setIsSavingOnClose] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // コンポーネントマウント時の時刻を保持（1週間判定用）
  // useStateの初期化関数内でDate.now()を使用（レンダリング中ではないため問題なし）
  const [mountTime] = useState(() => Date.now());

  // タスク一覧を取得（ページネーション対応）
  const tasksQuery = useTasks(selectedProjectType);

  // useInfiniteQueryのpagesをフラット化
  const tasks = useMemo<Task[]>(() => {
    if (!tasksQuery.data) return [];
    return tasksQuery.data.pages.flatMap((page) => page.tasks);
  }, [tasksQuery.data]);

  const isLoading = tasksQuery.isLoading;
  const hasNextPage = 'hasNextPage' in tasksQuery ? tasksQuery.hasNextPage : false;
  const isFetchingNextPage =
    'isFetchingNextPage' in tasksQuery ? tasksQuery.isFetchingNextPage : false;
  const fetchNextPage = 'fetchNextPage' in tasksQuery ? tasksQuery.fetchNextPage : undefined;

  // すべてのユーザーを取得（アサイン表示用）
  const { data: allUsers } = useUsers();

  // 区分ラベルは全プロジェクト共通
  const { data: allLabels } = useKubunLabels();

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

  // フィルタリングされたタスクを取得
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter((task: Task) => {
      // ステータスフィルタ
      if (filterStatus === 'not-completed' && task.flowStatus === '完了') {
        return false;
      }
      if (
        filterStatus !== 'all' &&
        filterStatus !== 'not-completed' &&
        task.flowStatus !== filterStatus
      ) {
        return false;
      }

      // アサインフィルタ
      if (filterAssignee !== 'all' && !task.assigneeIds.includes(filterAssignee)) {
        return false;
      }

      // 区分フィルタ
      if (filterLabel !== 'all' && task.kubunLabelId !== filterLabel) {
        return false;
      }

      // タイトル検索フィルタ
      if (filterTitle && !task.title.toLowerCase().includes(filterTitle.toLowerCase())) {
        return false;
      }

      // タイマー稼働中フィルタ
      if (filterTimerActive === 'active' && activeSessionValue?.taskId !== task.id) {
        return false;
      }
      if (filterTimerActive === 'inactive' && activeSessionValue?.taskId === task.id) {
        return false;
      }

      // ITアップ日フィルタ（月指定）
      if (filterItUpDateMonth && task.itUpDate) {
        const [year, month] = filterItUpDateMonth.split('-');
        const taskDate = new Date(task.itUpDate);
        const taskYear = taskDate.getFullYear();
        const taskMonth = taskDate.getMonth() + 1; // getMonth()は0始まりなので+1
        if (taskYear !== parseInt(year, 10) || taskMonth !== parseInt(month, 10)) {
          return false;
        }
      }
      // ITアップ日が未設定の場合、月フィルタが設定されていれば除外
      if (filterItUpDateMonth && !task.itUpDate) {
        return false;
      }

      // リリース日フィルタ（月指定）
      if (filterReleaseDateMonth && task.releaseDate) {
        const [year, month] = filterReleaseDateMonth.split('-');
        const taskDate = new Date(task.releaseDate);
        const taskYear = taskDate.getFullYear();
        const taskMonth = taskDate.getMonth() + 1; // getMonth()は0始まりなので+1
        if (taskYear !== parseInt(year, 10) || taskMonth !== parseInt(month, 10)) {
          return false;
        }
      }
      // リリース日が未設定の場合、月フィルタが設定されていれば除外
      if (filterReleaseDateMonth && !task.releaseDate) {
        return false;
      }

      return true;
    });
  }, [
    tasks,
    filterStatus,
    filterAssignee,
    filterLabel,
    filterTitle,
    filterTimerActive,
    filterItUpDateMonth,
    filterReleaseDateMonth,
    activeSessionValue,
  ]);

  // ソートロジック: 未アサインかつ作成から1週間以内のタスクを上位表示
  const sortedTasks = useMemo(() => {
    if (!filteredTasks) return [];

    // マウント時の時刻から1週間前を計算（子コンポーネントと同じ基準時刻を使用）
    const oneWeekAgo = mountTime - 7 * 24 * 60 * 60 * 1000;

    const isNewTask = (task: Task) => {
      return (
        task.assigneeIds.length === 0 && task.createdAt && task.createdAt.getTime() >= oneWeekAgo
      );
    };

    return [...filteredTasks].sort((a, b) => {
      const aIsNew = isNewTask(a);
      const bIsNew = isNewTask(b);

      // 条件に合うタスクを最優先
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;

      // それ以外は既存のソート順（createdAt降順）を維持
      const aTime = a.createdAt?.getTime() || 0;
      const bTime = b.createdAt?.getTime() || 0;
      return bTime - aTime;
    });
  }, [filteredTasks, mountTime]);

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

  const handleFilterTitleChange = (value: string) => {
    setFilterTitle(value);
    setCurrentPage(1);
  };

  const handleProjectTypeChange = (value: ProjectType | 'all') => {
    setSelectedProjectType(value);
    setCurrentPage(1);
  };

  const handleFilterStatusChange = (value: FlowStatus | 'all' | 'not-completed') => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handleFilterAssigneeChange = (value: string) => {
    setFilterAssignee(value);
    setCurrentPage(1);
  };

  const handleFilterLabelChange = (value: string) => {
    setFilterLabel(value);
    setCurrentPage(1);
  };

  const handleFilterTimerActiveChange = (value: string) => {
    setFilterTimerActive(value);
    setCurrentPage(1);
  };

  const handleFilterItUpDateMonthChange = (value: string) => {
    setFilterItUpDateMonth(value);
    setCurrentPage(1);
  };

  const handleFilterReleaseDateMonthChange = (value: string) => {
    setFilterReleaseDateMonth(value);
    setCurrentPage(1);
  };

  const requiredItemsForCurrentPage = currentPage * TASKS_PER_PAGE;
  const shouldRequestMoreData = hasNextPage && sortedTasks.length < requiredItemsForCurrentPage;

  useEffect(() => {
    if (!fetchNextPage || !shouldRequestMoreData || isFetchingNextPage) {
      return;
    }
    fetchNextPage();
  }, [fetchNextPage, shouldRequestMoreData, isFetchingNextPage]);

  const paginatedTasks = useMemo<Task[]>(() => {
    const start = (currentPage - 1) * TASKS_PER_PAGE;
    return sortedTasks.slice(start, start + TASKS_PER_PAGE);
  }, [sortedTasks, currentPage]);

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / TASKS_PER_PAGE));
  const canGoPrev = currentPage > 1;
  const canGoNext = hasNextPage || currentPage < totalPages;

  const paginatedRangeStart =
    paginatedTasks.length > 0 ? (currentPage - 1) * TASKS_PER_PAGE + 1 : 0;
  const paginatedRangeEnd =
    paginatedTasks.length > 0 ? paginatedRangeStart + paginatedTasks.length - 1 : 0;

  const totalKnownCount = sortedTasks.length;
  const rangeLabel =
    paginatedTasks.length === 0
      ? hasNextPage || isFetchingNextPage
        ? '表示中: 読み込み中...'
        : '表示中: 0件'
      : `表示中: ${paginatedRangeStart}-${paginatedRangeEnd}件 / ${
          hasNextPage ? `${totalKnownCount}+` : totalKnownCount
        }件`;

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

  // 区分ラベルは全プロジェクト共通なので、そのまま使用
  const taskLabels = useMemo(() => allLabels || [], [allLabels]);

  // 「個別」ラベルのIDを取得
  const kobetsuLabelId = useMemo(() => {
    return allLabels?.find((label) => label.name === '個別')?.id || null;
  }, [allLabels]);

  // 選択されたタスクのセッション履歴を取得
  const selectedTaskProjectType = selectedTask?.projectType ?? null;
  const { data: taskSessions } = useTaskSessions(selectedTaskProjectType, selectedTaskIdValue);

  const updateTask = useUpdateTask();

  const handleDrawerClose = async () => {
    if (!taskFormDataValue || !selectedTask) {
      resetSelection();
      return;
    }

    const projectType = selectedTask?.projectType;
    if (!projectType) {
      resetSelection();
      return;
    }

    // 変更があるかチェック（改善版: Date型と配列の正確な比較）
    const hasChanges = Object.keys(taskFormDataValue).some((key) => {
      const formValue = taskFormDataValue[key as keyof Task];
      const taskValue = selectedTask[key as keyof Task];

      // Date型の比較
      if (formValue instanceof Date && taskValue instanceof Date) {
        return formValue.getTime() !== taskValue.getTime();
      }

      // 配列の比較 (assigneeIds等)
      if (Array.isArray(formValue) && Array.isArray(taskValue)) {
        return JSON.stringify(formValue) !== JSON.stringify(taskValue);
      }

      return formValue !== taskValue;
    });

    // 変更がある場合のみ保存
    if (hasChanges) {
      setIsSavingOnClose(true);
      try {
        await updateTask.mutateAsync({
          projectType,
          taskId: selectedTask.id,
          updates: taskFormDataValue,
        });
        setSnackbarMessage('タスクを保存しました');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        resetSelection();
      } catch (error) {
        console.error('保存に失敗しました:', error);
        const errorMessage = error instanceof Error
          ? error.message
          : '保存に失敗しました。もう一度お試しください。';
        setSnackbarMessage(errorMessage);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        // エラー時はDrawerを開いたまま
      } finally {
        setIsSavingOnClose(false);
      }
    } else {
      resetSelection();
    }
  };

  const handleDeleteClick = (taskId: string, projectType: string) => {
    setDeleteTaskId(taskId);
    setDeleteProjectType(projectType);
    setDeleteDialogOpen(true);
    setDeleteConfirmTitle('');
  };

  const deleteTask = useDeleteTask();

  const handleDeleteTask = async () => {
    if (!deleteTaskId || !deleteProjectType) return;

  const taskToDelete = tasks?.find((t: Task) => t.id === deleteTaskId);
    if (!taskToDelete) {
      alert('タスクが見つかりません');
      setDeleteDialogOpen(false);
      return;
    }

    // タイトルが一致しない場合は削除しない
    if (deleteConfirmTitle !== taskToDelete.title) {
      alert('タイトルが一致しません。削除をキャンセルしました。');
      setDeleteDialogOpen(false);
      setDeleteConfirmTitle('');
      return;
    }

    deleteTask.mutate(
      {
        projectType: deleteProjectType as ProjectType,
        taskId: deleteTaskId,
      },
      {
        onSuccess: () => {
          // 削除したタスクが選択されていた場合はサイドバーを閉じる
          if (selectedTaskIdValue === deleteTaskId) {
            resetSelection();
          }
          alert('タスクを削除しました');
        },
        onError: (error: Error) => {
          console.error('Delete task error:', error);
          alert(`タスクの削除に失敗しました: ${error.message || '不明なエラー'}`);
        },
        onSettled: () => {
          setDeleteDialogOpen(false);
          setDeleteTaskId(null);
          setDeleteProjectType(null);
          setDeleteConfirmTitle('');
        },
      }
    );
  };

  const handleResetFilters = () => {
    resetFilters();
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    if (!canGoPrev) return;
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (!canGoNext) return;
    setCurrentPage((prev) => prev + 1);
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
          }}
        >
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            タスク一覧
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <CustomButton variant="outline" onClick={handleResetFilters}>
              フィルタリセット
            </CustomButton>
            <Link href="/tasks/new" style={{ textDecoration: 'none' }}>
              <CustomButton>新規作成</CustomButton>
            </Link>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TaskSearchForm
                value={filterTitle}
                onChange={handleFilterTitleChange}
                placeholder="タイトルで検索..."
                label="タイトル検索"
              />
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>プロジェクト</InputLabel>
                <Select
                  value={selectedProjectType}
                  onChange={(e) => handleProjectTypeChange(e.target.value as ProjectType | 'all')}
                  label="プロジェクト"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  {PROJECT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) =>
                    handleFilterStatusChange(e.target.value as FlowStatus | 'all' | 'not-completed')
                  }
                  label="ステータス"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="not-completed">完了以外</MenuItem>
                  {FLOW_STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>
                      {FLOW_STATUS_LABELS[status]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>アサイン</InputLabel>
                <Select
                  value={filterAssignee}
                  onChange={(e) => handleFilterAssigneeChange(e.target.value)}
                  label="アサイン"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  {allUsers?.map((userItem) => (
                    <MenuItem key={userItem.id} value={userItem.id}>
                      {userItem.displayName || userItem.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>区分</InputLabel>
                <Select
                  value={filterLabel}
                  onChange={(e) => handleFilterLabelChange(e.target.value)}
                  label="区分"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  {allLabels?.map((label) => (
                    <MenuItem key={label.id} value={label.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: label.color,
                          }}
                        />
                        {label.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>タイマー</InputLabel>
                <Select
                  value={filterTimerActive}
                  onChange={(e) => handleFilterTimerActiveChange(e.target.value)}
                  label="タイマー"
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="active">稼働中のみ</MenuItem>
                  <MenuItem value="inactive">停止中のみ</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="ITアップ日（月）"
                type="month"
                value={filterItUpDateMonth}
                onChange={(e) => handleFilterItUpDateMonthChange(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="リリース日（月）"
                type="month"
                value={filterReleaseDateMonth}
                onChange={(e) => handleFilterReleaseDateMonthChange(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Box>

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
          emptyMessage={effectiveEmptyMessage}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 2,
            gap: 2,
            flexWrap: 'wrap',
          }}
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
              {!hasNextPage && filteredTasks.length > 0 ? ` / ${totalPages}` : ''}
            </Typography>
            <CustomButton
              variant="outline"
              onClick={handleNextPage}
              disabled={!canGoNext || isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <CircularProgress size={14} sx={{ color: 'inherit' }} />
              ) : (
                '次へ'
              )}
            </CustomButton>
          </Box>
        </Box>
      </Box>

      {/* サイドバー */}
      <TaskDetailDrawer
        open={!!selectedTaskIdValue && !isSavingOnClose}
        onClose={handleDrawerClose}
        selectedTask={selectedTask}
        taskFormData={taskFormDataValue}
        onTaskFormDataChange={setTaskFormDataValue}
        onDelete={handleDeleteClick}
        isSaving={updateTask.isPending || isSavingOnClose}
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
        formatDuration={formatDuration}
      />

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>タスクを削除</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            この操作は取り消せません。タスクを削除するには、タイトルを正確に入力してください。
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="タイトルを入力"
            value={deleteConfirmTitle}
            onChange={(e) => setDeleteConfirmTitle(e.target.value)}
            placeholder={tasks?.find((t: Task) => t.id === deleteTaskId)?.title || ''}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <CustomButton
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteConfirmTitle('');
            }}
          >
            キャンセル
          </CustomButton>
          <CustomButton
            variant="destructive"
            onClick={handleDeleteTask}
            disabled={
              deleteConfirmTitle !== tasks?.find((t: Task) => t.id === deleteTaskId)?.title
            }
          >
            削除
          </CustomButton>
        </DialogActions>
      </Dialog>

      {/* 保存通知用Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
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
