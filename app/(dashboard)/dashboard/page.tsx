'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useUpdateTask } from '@/hooks/useTasks';
import { useTaskSessions } from '@/hooks/useTaskSessions';
import { useTaskDetailActions } from '@/hooks/useTaskDetailActions';
import { useTaskDetailState } from '@/hooks/useTaskDetailState';
import { Button as CustomButton } from '@/components/ui/button';
import { hasTaskChanges } from '@/utils/taskUtils';
import { useToast } from '@/hooks/useToast';
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import TableRowsIcon from '@mui/icons-material/TableRows';
import GridViewIcon from '@mui/icons-material/GridView';
import { TaskDetailDrawer } from '@/components/Drawer/TaskDetailDrawer';
import { TaskListTable } from '@/components/tasks/TaskListTable';
import { TaskCardGrid } from '@/components/tasks/TaskCardGrid';
import { queryKeys } from '@/lib/queryKeys';
import { fetchAssignedOpenTasks } from '@/lib/firestore/repositories/taskRepository';
import { useTaskStore, DashboardViewMode } from '@/stores/taskStore';

function DashboardPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const { dashboardViewMode, setDashboardViewMode } = useTaskStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectType, setDeleteProjectType] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [isSavingOnClose, setIsSavingOnClose] = useState(false);

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: DashboardViewMode | null) => {
    if (newMode !== null) {
      setDashboardViewMode(newMode);
    }
  };

  // 自分のタスクかつ完了以外のタスクを取得
  const { data: tasks, isLoading } = useQuery({
    queryKey: queryKeys.dashboardTasks(user?.id),
    queryFn: async () => {
      if (!db || !user) return [];
      return fetchAssignedOpenTasks(user.id);
    },
    enabled: !!user && !!db,
  });

  // すべてのユーザーを取得（アサイン表示用）
  const { data: allUsers } = useUsers();

  // 区分ラベルは全プロジェクト共通
  const { data: allLabels } = useKubunLabels();

  const {
    activeSession,
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
    listQueryKeys: [queryKeys.dashboardTasks(user?.id), queryKeys.tasks('all')],
    refetchListQueryKeys: [queryKeys.dashboardTasks(user?.id)],
    detailQueryKey: (taskId) => queryKeys.task(taskId),
    refetchListOnChat: false,
    refetchDetailOnChat: false,
  });

  // 時間計測中のタスクを最優先でソート
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];

    return [...tasks].sort((a, b) => {
      const aIsActive = activeSession?.taskId === a.id;
      const bIsActive = activeSession?.taskId === b.id;

      // 時間計測中のタスクを最優先
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // それ以外は作成日時の降順
      const aTime = a.createdAt?.getTime() || 0;
      const bTime = b.createdAt?.getTime() || 0;
      return bTime - aTime;
    });
  }, [tasks, activeSession]);

  const {
    selectedTaskId,
    selectedTask,
    taskFormData,
    setTaskFormData,
    handleTaskSelect,
    resetSelection,
  } = useTaskDetailState({
    tasks: sortedTasks || [],
    initializeMode: 'always',
  });

  // 区分ラベルは全プロジェクト共通なので、そのまま使用
  const taskLabels = useMemo(() => allLabels || [], [allLabels]);

  // 「個別」ラベルのIDを取得
  const kobetsuLabelId = useMemo(() => {
    return allLabels?.find((label) => label.name === '個別')?.id || null;
  }, [allLabels]);

  // 選択されたタスクのセッション履歴を取得
  const selectedTaskProjectType = selectedTask?.projectType ?? null;
  const { data: taskSessions } = useTaskSessions(selectedTaskProjectType, selectedTaskId);

  const updateTask = useUpdateTask();

  const handleDrawerClose = async () => {
    // 競合状態の防止: 既に保存中の場合は何もしない
    if (isSavingOnClose) return;

    if (!taskFormData || !selectedTask) {
      resetSelection();
      return;
    }

    const projectType = selectedTask?.projectType;
    if (!projectType) {
      resetSelection();
      return;
    }

    // 変更があるかチェック（改善版: 全フィールド、Date型、配列、null/undefinedの正確な比較）
    const changeDetected = hasTaskChanges(taskFormData, selectedTask);

    // 変更がある場合のみ保存
    if (changeDetected) {
      setIsSavingOnClose(true);
      try {
        await updateTask.mutateAsync({
          projectType,
          taskId: selectedTask.id,
          updates: taskFormData,
        });

        // 保存成功時にキャッシュを無効化してリアルタイム反映
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardTasks(user?.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.task(selectedTask.id) });

        success('タスクを保存しました');
        resetSelection();
      } catch (error) {
        console.error('保存に失敗しました:', error);
        const errorMessage = error instanceof Error
          ? error.message
          : '保存に失敗しました。もう一度お試しください。';
        showError(errorMessage);
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

  const handleDeleteTask = async () => {
    if (!deleteTaskId || !deleteProjectType || !db) return;

    const taskToDelete = sortedTasks?.find((t) => t.id === deleteTaskId);
    if (!taskToDelete) {
      alert('タスクが見つかりません');
      setDeleteDialogOpen(false);
      return;
    }

    if (deleteConfirmTitle !== taskToDelete.title) {
      alert('タイトルが一致しません。削除をキャンセルしました。');
      setDeleteDialogOpen(false);
      setDeleteConfirmTitle('');
      return;
    }

    try {
      const taskRef = doc(db, 'projects', deleteProjectType, 'tasks', deleteTaskId);
      await deleteDoc(taskRef);

      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardTasks(user?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
      queryClient.refetchQueries({ queryKey: queryKeys.dashboardTasks(user?.id) });

      if (selectedTaskId === deleteTaskId) {
        resetSelection();
      }

      alert('タスクを削除しました');
    } catch (error: any) {
      console.error('Delete task error:', error);

      alert(`タスクの削除に失敗しました: ${error.message || '不明なエラー'}`);
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTaskId(null);
      setDeleteProjectType(null);
      setDeleteConfirmTitle('');
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            ダッシュボード
          </Typography>
          <ToggleButtonGroup value={dashboardViewMode} exclusive onChange={handleViewModeChange} size="small">
            <ToggleButton value="table" aria-label="テーブル表示">
              <Tooltip title="テーブル表示">
                <TableRowsIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="card" aria-label="カード表示">
              <Tooltip title="カード表示">
                <GridViewIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {dashboardViewMode === 'table' ? (
          <TaskListTable
            tasks={sortedTasks || []}
            onTaskSelect={handleTaskSelect}
            allUsers={allUsers}
            allLabels={allLabels}
            activeSession={activeSession}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            isStoppingTimer={isStoppingTimer}
            kobetsuLabelId={kobetsuLabelId}
            currentUserId={user?.id || null}
            emptyMessage="自分のタスクがありません"
            rowSx={(task, isActive) =>
              isActive
                ? {
                    bgcolor: 'rgba(76, 175, 80, 0.08)',
                    '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.12)' },
                  }
                : {}
            }
          />
        ) : (
          <TaskCardGrid
            tasks={sortedTasks || []}
            onTaskSelect={handleTaskSelect}
            allLabels={allLabels}
            currentUserId={user?.id || null}
            emptyMessage="自分のタスクがありません"
          />
        )}
      </Box>

      {/* サイドバー */}
      <TaskDetailDrawer
        open={!!selectedTaskId && !isSavingOnClose}
        onClose={handleDrawerClose}
        selectedTask={selectedTask}
        taskFormData={taskFormData}
        onTaskFormDataChange={setTaskFormData}
        onDelete={handleDeleteClick}
        isSaving={updateTask.isPending || isSavingOnClose}
        taskLabels={taskLabels}
        allUsers={allUsers}
        activeSession={activeSession}
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
            placeholder={sortedTasks?.find((t) => t.id === deleteTaskId)?.title || ''}
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
            disabled={deleteConfirmTitle !== sortedTasks?.find((t) => t.id === deleteTaskId)?.title}
          >
            削除
          </CustomButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function DashboardPage() {
  return <DashboardPageContent />;
}
