'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FlowStatus } from '@/types';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useActiveSession, useTaskSessions } from '@/hooks/useTaskSessions';
import { useTimer } from '@/hooks/useTimer';
import { useDriveIntegration, useFireIntegration } from '@/hooks/useIntegrations';
import { useTaskStore } from '@/stores/taskStore';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import {
  FLOW_STATUS_OPTIONS,
  FLOW_STATUS_LABELS,
} from '@/constants/taskConstants';
import { formatDuration as formatDurationUtil } from '@/utils/timer';
import { Button as CustomButton } from '@/components/ui/button';
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
import { TaskDetailDrawer } from '@/components/drawer/TaskDetailDrawer';
import { TaskListTable } from '@/components/tasks/TaskListTable';

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
    activeSession,
    setActiveSession,
    resetFilters,
  } = useTaskStore();
  const { startTimer, stopTimer } = useTimer();
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectType, setDeleteProjectType] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');

  // タスク一覧を取得
  const { data: tasks, isLoading } = useTasks(selectedProjectType);

  // すべてのユーザーを取得（アサイン表示用）
  const { data: allUsers } = useUsers();

  // 区分ラベルは全プロジェクト共通
  const { data: allLabels } = useKubunLabels();

  // フィルタリングされたタスクを取得
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter((task) => {
      // ステータスフィルタ
      if (filterStatus !== 'all' && task.flowStatus !== filterStatus) {
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
    filterTimerActive,
    filterItUpDateMonth,
    filterReleaseDateMonth,
    activeSession,
  ]);

  // 選択されたタスクの詳細を取得
  const selectedTask = useMemo(
    () => filteredTasks?.find((t) => t.id === selectedTaskId) || null,
    [filteredTasks, selectedTaskId]
  );

  // 選択されたタスクが変更されたらフォームデータを初期化
  useEffect(() => {
    if (selectedTask && selectedTaskId) {
      // フォームデータが存在しない場合、または選択されたタスクIDが変更された場合のみ初期化
      if (!taskFormData || (taskFormData && selectedTask.id === selectedTaskId)) {
        setTaskFormData({
          title: selectedTask.title,
          description: selectedTask.description || '',
          flowStatus: selectedTask.flowStatus,
          kubunLabelId: selectedTask.kubunLabelId,
          itUpDate: selectedTask.itUpDate,
          releaseDate: selectedTask.releaseDate,
          dueDate: selectedTask.dueDate,
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
    const task = filteredTasks?.find((t) => t.id === taskId);
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
    if (!user) return;
    try {
      await startTimer.mutateAsync({
        projectType: projectType,
        taskId,
        userId: user.id,
      });
      // アクティブセッションを再取得
      queryClient.invalidateQueries({ queryKey: ['activeSession', user.id] });
      queryClient.refetchQueries({ queryKey: ['activeSession', user.id] });
    } catch (error: any) {
      console.error('Timer start error:', error);
      if (error.message?.includes('稼働中')) {
        alert('他のタイマーが稼働中です。停止してから開始してください。');
      } else {
        alert(`タイマーの開始に失敗しました: ${error.message || '不明なエラー'}`);
      }
    }
  };

  const handleStopTimer = async () => {
    if (!activeSession) return;
    try {
      await stopTimer.mutateAsync({
        projectType: activeSession.projectType,
        sessionId: activeSession.sessionId,
      });
      setActiveSession(null);
      // アクティブセッションを再取得
      queryClient.invalidateQueries({ queryKey: ['activeSession', user?.id] });
      queryClient.refetchQueries({ queryKey: ['activeSession', user?.id] });
    } catch (error: any) {
      console.error('Timer stop error:', error);
      alert(`タイマーの停止に失敗しました: ${error.message || '不明なエラー'}`);
    }
  };

  const handleDriveCreate = async (projectType: string, taskId: string) => {
    try {
      const result = await createDriveFolder.mutateAsync({ projectType: projectType, taskId });
      // タスク一覧と詳細を更新（URLが反映されるように）
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.refetchQueries({ queryKey: ['task', taskId] });

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
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // タスク一覧を更新
      queryClient.refetchQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      console.error('Fire create error:', error);
      alert(`GitHub Issueの作成に失敗しました: ${error.message || '不明なエラー'}`);
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

    const taskToDelete = tasks?.find((t) => t.id === deleteTaskId);
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
            <CustomButton variant="outline" onClick={resetFilters}>
              フィルタリセット
            </CustomButton>
            <Link href="/tasks/new" style={{ textDecoration: 'none' }}>
              <CustomButton>新規作成</CustomButton>
            </Link>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
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
                  onChange={(e) => setFilterStatus(e.target.value as FlowStatus | 'all')}
                  label="ステータス"
                >
                  <MenuItem value="all">すべて</MenuItem>
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
          tasks={filteredTasks || []}
          onTaskSelect={handleTaskSelect}
          selectedProjectType={selectedProjectType}
          allUsers={allUsers}
          allLabels={allLabels}
          activeSession={activeSession}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          isStartingTimer={startTimer.isPending}
          isStoppingTimer={stopTimer.isPending}
          kobetsuLabelId={kobetsuLabelId}
          emptyMessage={
            tasks && tasks.length === 0
              ? selectedProjectType === 'all'
                ? 'タスクがありません'
                : 'このプロジェクトにタスクがありません'
              : 'フィルタ条件に一致するタスクがありません'
          }
        />
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
        isStartingTimer={startTimer.isPending}
        isStoppingTimer={stopTimer.isPending}
        onDriveCreate={handleDriveCreate}
        isCreatingDrive={createDriveFolder.isPending}
        onFireCreate={handleFireCreate}
        isCreatingFire={createFireIssue.isPending}
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
            placeholder={tasks?.find((t) => t.id === deleteTaskId)?.title || ''}
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
            disabled={deleteConfirmTitle !== tasks?.find((t) => t.id === deleteTaskId)?.title}
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
