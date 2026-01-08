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
} from '@mui/material';
import { TaskDetailDrawer } from '@/components/Drawer/TaskDetailDrawer';
import { TaskListTable } from '@/components/tasks/TaskListTable';
import { queryKeys } from '@/lib/queryKeys';
import { fetchAssignedOpenTasks } from '@/lib/firestore/repositories/taskRepository';

function DashboardPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectType, setDeleteProjectType] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');

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
  const selectedTaskProjectType = (selectedTask as any)?.projectType;
  const { data: taskSessions } = useTaskSessions(selectedTaskProjectType, selectedTaskId);

  const updateTask = useUpdateTask();

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

  const handleDrawerClose = () => {
    // Drawerを閉じる前に保存
    handleSave();
    resetSelection();
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
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            ダッシュボード
          </Typography>
        </Box>

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
      </Box>

      {/* サイドバー */}
      <TaskDetailDrawer
        open={!!selectedTaskId}
        onClose={handleDrawerClose}
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
