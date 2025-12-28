'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FlowStatus, Task } from '@/types';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useActiveSession, useTaskSessions } from '@/hooks/useTaskSessions';
import { useTimerActions } from '@/hooks/useTimerActions';
import {
  useDriveIntegration,
  useFireIntegration,
  useGoogleChatIntegration,
} from '@/hooks/useIntegrations';
import { useTaskStore } from '@/stores/taskStore';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { FLOW_STATUS_OPTIONS, FLOW_STATUS_LABELS } from '@/constants/taskConstants';
import { formatDuration as formatDurationUtil } from '@/utils/timer';
import { Button as CustomButton } from '@/components/ui/button';
import { buildTaskDetailUrl } from '@/utils/taskLinks';
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
} from '@mui/material';
import Link from 'next/link';
import { TaskDetailDrawer } from '@/components/Drawer/TaskDetailDrawer';
import { TaskListTable } from '@/components/tasks/TaskListTable';
import { TaskSearchForm } from '@/components/tasks/TaskSearchForm';

const TASKS_PER_PAGE = 10;
type ExtendedTask = Task & { projectType: ProjectType };

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
  const { stopTimer, startTimerWithOptimistic, stopActiveSession } = useTimerActions({
    userId: user?.id,
    queryClient,
    setActiveSession,
  });
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const { createGoogleChatThread } = useGoogleChatIntegration();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectType, setDeleteProjectType] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // コンポーネントマウント時の時刻を保持（1週間判定用）
  // useStateの初期化関数内でDate.now()を使用（レンダリング中ではないため問題なし）
  const [mountTime] = useState(() => Date.now());

  // タスク一覧を取得（ページネーション対応）
  const tasksQuery = useTasks(selectedProjectType);

  // useInfiniteQueryの場合はpagesをフラット化、useQueryの場合はそのまま使用
  const tasks = useMemo<ExtendedTask[]>(() => {
    if (!tasksQuery.data) return [];

    // useInfiniteQueryの場合
    if ('pages' in tasksQuery.data && Array.isArray(tasksQuery.data.pages)) {
      return tasksQuery.data.pages.flatMap((page: { tasks?: Task[] }) => {
        if (!page || !page.tasks) return [];
        return page.tasks as ExtendedTask[];
      });
    }

    // useQueryの場合（'all'の時）
    if (Array.isArray(tasksQuery.data)) {
      return tasksQuery.data as ExtendedTask[];
    }

    return [];
  }, [tasksQuery.data]) as Task[];

  const isLoading = tasksQuery.isLoading;
  const hasNextPage = 'hasNextPage' in tasksQuery ? tasksQuery.hasNextPage : false;
  const isFetchingNextPage =
    'isFetchingNextPage' in tasksQuery ? tasksQuery.isFetchingNextPage : false;
  const fetchNextPage = 'fetchNextPage' in tasksQuery ? tasksQuery.fetchNextPage : undefined;

  // すべてのユーザーを取得（アサイン表示用）
  const { data: allUsers } = useUsers();

  // 区分ラベルは全プロジェクト共通
  const { data: allLabels } = useKubunLabels();

  // フィルタリングされたタスクを取得
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter((task: ExtendedTask) => {
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
      if (filterTimerActive === 'active' && activeSession?.taskId !== task.id) {
        return false;
      }
      if (filterTimerActive === 'inactive' && activeSession?.taskId === task.id) {
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
    activeSession,
  ]);

  // ソートロジック: 未アサインかつ作成から1週間以内のタスクを上位表示
  const sortedTasks = useMemo(() => {
    if (!filteredTasks) return [];

    // マウント時の時刻から1週間前を計算（子コンポーネントと同じ基準時刻を使用）
    const oneWeekAgo = mountTime - 7 * 24 * 60 * 60 * 1000;

    const isNewTask = (task: ExtendedTask) => {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedProjectType,
    filterStatus,
    filterAssignee,
    filterLabel,
    filterTitle,
    filterTimerActive,
    filterItUpDateMonth,
    filterReleaseDateMonth,
  ]);

  const requiredItemsForCurrentPage = currentPage * TASKS_PER_PAGE;
  const shouldRequestMoreData = hasNextPage && sortedTasks.length < requiredItemsForCurrentPage;

  useEffect(() => {
    if (!fetchNextPage || !shouldRequestMoreData || isFetchingNextPage) {
      return;
    }
    fetchNextPage();
  }, [fetchNextPage, shouldRequestMoreData, isFetchingNextPage]);

  const paginatedTasks = useMemo<ExtendedTask[]>(() => {
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

  // 選択されたタスクの詳細を取得
  const selectedTask = useMemo(
    () => sortedTasks?.find((t: ExtendedTask) => t.id === selectedTaskId) || null,
    [sortedTasks, selectedTaskId]
  );

  // 選択されたタスクが変更されたらフォームデータを初期化
  useEffect(() => {
    if (selectedTask && selectedTaskId) {
      // フォームデータが存在しない場合のみ初期化
      // （毎回再初期化すると、handleTaskSelectで設定したassigneeIdsなどが上書きされて消えるため）
      if (!taskFormData) {
        setTaskFormData({
          title: selectedTask.title,
          description: selectedTask.description || '',
          flowStatus: selectedTask.flowStatus,
          kubunLabelId: selectedTask.kubunLabelId,
          itUpDate: selectedTask.itUpDate,
          releaseDate: selectedTask.releaseDate,
          dueDate: selectedTask.dueDate,
          assigneeIds: selectedTask.assigneeIds || [],
        });
      }
    } else if (!selectedTaskId) {
      // タスクが選択されていない場合はフォームデータをリセット
      setTaskFormData(null);
    }
    // selectedTask, setTaskFormData, taskFormDataは意図的に依存配列から除外
    // - selectedTask: オブジェクト全体を依存配列に入れると、参照が変わるたびに再実行される
    // - setTaskFormData: Zustandのsetterは安定しているため不要
    // - taskFormData: 依存配列に入れると無限ループになる可能性がある
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask?.id, selectedTaskId]);

  // 区分ラベルは全プロジェクト共通なので、そのまま使用
  const taskLabels = useMemo(() => allLabels || [], [allLabels]);

  // 「個別」ラベルのIDを取得
  const kobetsuLabelId = useMemo(() => {
    return allLabels?.find((label) => label.name === '個別')?.id || null;
  }, [allLabels]);

  // 選択されたタスクのセッション履歴を取得
  const selectedTaskProjectType = (selectedTask as any)?.projectType;
  const { data: taskSessions } = useTaskSessions(selectedTaskProjectType, selectedTaskId);

  // アクティブなセッションを取得（すべてのプロジェクトタイプから）
  useActiveSession(user?.id || null, setActiveSession);

  const updateTask = useUpdateTask();

  // タスクが選択されたらフォームデータを初期化
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    const task = sortedTasks?.find((t: ExtendedTask) => t.id === taskId);
    if (task) {
      setTaskFormData({
        title: task.title,
        description: task.description || '',
        flowStatus: task.flowStatus,
        kubunLabelId: task.kubunLabelId,
        assigneeIds: task.assigneeIds,
        itUpDate: task.itUpDate,
        releaseDate: task.releaseDate,
      });
    }
  };

  const handleSave = () => {
    if (!taskFormData || !selectedTask) return;
    const projectType = (selectedTask as any)?.projectType;
    if (!projectType) return;
    updateTask.mutate({
      projectType,
      taskId: selectedTask.id,
      updates: taskFormData,
    });
  };

  const formatDuration = (
    seconds: number | undefined | null,
    startedAt?: Date,
    endedAt?: Date | null
  ) => {
    let secs = 0;
    if (seconds === undefined || seconds === null || Number.isNaN(seconds) || seconds === 0) {
      if (endedAt && startedAt) {
        secs = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      } else {
        return '0秒';
      }
    } else {
      secs = Math.floor(Number(seconds));
    }
    return formatDurationUtil(secs);
  };

  const handleStartTimer = async (projectType: string, taskId: string) => {
    await startTimerWithOptimistic(projectType, taskId);
  };

  const handleStopTimer = async () => {
    await stopActiveSession(activeSession);
  };

  const handleDriveCreate = async (projectType: string, taskId: string) => {
    try {
      const result = await createDriveFolder.mutateAsync({ projectType: projectType, taskId });
      // タスク一覧と詳細を更新（URLが反映されるように）
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
      queryClient.refetchQueries({ queryKey: queryKeys.tasks('all') });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.refetchQueries({ queryKey: queryKeys.task(taskId) });

      if (result.warning) {
        // チェックシート作成エラーがある場合（警告として表示）
        alert(
          `Driveフォルダを作成しましたが、チェックシートの作成に失敗しました。\n\nフォルダURL: ${result.url || '取得できませんでした'}\n\nエラー: ${result.error || '不明なエラー'}`
        );
      }
      // 完全に成功した場合はalertを表示しない
    } catch (error: any) {
      console.error('Drive create error:', error);
      const errorMessage = error?.message || '不明なエラー';
      alert(`Driveフォルダの作成に失敗しました: ${errorMessage}`);
    }
  };

  const handleFireCreate = async (projectType: string, taskId: string) => {
    try {
      await createFireIssue.mutateAsync({ projectType: projectType, taskId });
      // 成功時はalertを表示しない
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') }); // タスク一覧を更新
      queryClient.refetchQueries({ queryKey: queryKeys.tasks('all') });
    } catch (error: any) {
      console.error('Fire create error:', error);
      alert(`GitHub Issueの作成に失敗しました: ${error.message || '不明なエラー'}`);
    }
  };

  const handleChatThreadCreate = async (projectType: string, taskId: string) => {
    try {
      const taskUrl = buildTaskDetailUrl(taskId);
      if (!taskUrl) {
        alert('タスクのURLを生成できませんでした。');
        return;
      }

      await createGoogleChatThread.mutateAsync({ projectType: projectType, taskId, taskUrl });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
      queryClient.refetchQueries({ queryKey: queryKeys.tasks('all') });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.refetchQueries({ queryKey: queryKeys.task(taskId) });
    } catch (error: any) {
      console.error('Chat thread create error:', error);
      alert(`Google Chatスレッドの作成に失敗しました: ${error.message || '不明なエラー'}`);
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

    const taskToDelete = tasks?.find((t: ExtendedTask) => t.id === deleteTaskId);
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
          if (selectedTaskId === deleteTaskId) {
            setSelectedTaskId(null);
            setTaskFormData(null);
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
                onChange={setFilterTitle}
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
                  onChange={(e) => setSelectedProjectType(e.target.value as ProjectType | 'all')}
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
                    setFilterStatus(e.target.value as FlowStatus | 'all' | 'not-completed')
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
                  onChange={(e) => setFilterAssignee(e.target.value)}
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
                  onChange={(e) => setFilterLabel(e.target.value)}
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
                  onChange={(e) => setFilterTimerActive(e.target.value)}
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
                onChange={(e) => setFilterItUpDateMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="リリース日（月）"
                type="month"
                value={filterReleaseDateMonth}
                onChange={(e) => setFilterReleaseDateMonth(e.target.value)}
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
          activeSession={activeSession}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          isStoppingTimer={stopTimer.isPending}
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
        open={!!selectedTaskId}
        onClose={() => {
          setSelectedTaskId(null);
          setTaskFormData(null);
        }}
        selectedTask={selectedTask}
        taskFormData={taskFormData}
        onTaskFormDataChange={setTaskFormData}
        onSave={handleSave}
        onDelete={handleDeleteClick}
        isSaving={updateTask.isPending}
        taskLabels={taskLabels}
        allUsers={allUsers}
        activeSession={activeSession}
        onStartTimer={handleStartTimer}
        onStopTimer={handleStopTimer}
        isStoppingTimer={stopTimer.isPending}
        onDriveCreate={handleDriveCreate}
        isCreatingDrive={createDriveFolder.isPending}
        onFireCreate={handleFireCreate}
        isCreatingFire={createFireIssue.isPending}
        onChatThreadCreate={handleChatThreadCreate}
        isCreatingChatThread={createGoogleChatThread.isPending}
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
            placeholder={tasks?.find((t: ExtendedTask) => t.id === deleteTaskId)?.title || ''}
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
              deleteConfirmTitle !== tasks?.find((t: ExtendedTask) => t.id === deleteTaskId)?.title
            }
          >
            削除
          </CustomButton>
        </DialogActions>
      </Dialog>
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
