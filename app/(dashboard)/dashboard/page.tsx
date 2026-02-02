'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useTaskSessions } from '@/hooks/useTaskSessions';
import { useTaskDetailActions } from '@/hooks/useTaskDetailActions';
import { useTaskDetailState } from '@/hooks/useTaskDetailState';
import { useTaskDrawer } from '@/hooks/useTaskDrawer';
import { useUpdateTasksOrder, calculateNewOrder } from '@/hooks/useUpdateTasksOrder';
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
  const { dashboardViewMode, setDashboardViewMode, sortMode, setSortMode } = useTaskStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectType, setDeleteProjectType] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');

  const handleViewModeChange = (
    _: React.MouseEvent<HTMLElement>,
    newMode: DashboardViewMode | null
  ) => {
    if (newMode !== null) {
      setDashboardViewMode(newMode);
    }
  };

  // タスク並び替え用mutation
  const updateTasksOrder = useUpdateTasksOrder();

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

  // 時間計測中のタスクを最優先でソート（sortModeに応じて並び替え）
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];

    return [...tasks].sort((a, b) => {
      const aIsActive = activeSession?.taskId === a.id;
      const bIsActive = activeSession?.taskId === b.id;

      // 時間計測中のタスクを最優先
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // sortModeに応じてソート
      if (sortMode === 'itUpDate-asc' || sortMode === 'itUpDate-desc') {
        const aDate = a.itUpDate;
        const bDate = b.itUpDate;
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1; // nullは末尾
        if (!bDate) return -1;
        const diff = aDate.getTime() - bDate.getTime();
        return sortMode === 'itUpDate-asc' ? diff : -diff;
      }

      // デフォルト: order順でソート
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [tasks, activeSession, sortMode]);

  // D&Dハンドラ
  const handleDragEnd = useCallback(
    (activeId: string, overId: string) => {
      if (!sortedTasks) return;
      const orderUpdates = calculateNewOrder(sortedTasks, activeId, overId);
      if (orderUpdates.length > 0) {
        updateTasksOrder.mutate(orderUpdates);
      }
    },
    [sortedTasks, updateTasksOrder]
  );

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

  // Drawer管理（useTaskDrawerフックを使用）
  const dashboardQueryKeys = useMemo(
    () => (user?.id ? [queryKeys.dashboardTasks(user.id)] : []),
    [user?.id]
  );
  const { isSavingOnClose, saveCurrentChanges, handleDrawerClose } = useTaskDrawer({
    queryClient,
    selectedTask,
    taskFormDataValue: taskFormData,
    resetSelection,
    extraInvalidateQueryKeys: dashboardQueryKeys,
  });

  // チャット/Drive/Fire作成前に保存を行うラッパー関数
  const handleDriveCreateWithSave = async () => {
    if (!selectedTask) return;
    const saved = await saveCurrentChanges();
    if (!saved) {
      alert('タスクの保存に失敗しました。再度お試しください。');
      return;
    }
    await handleDriveCreate(selectedTask.projectType, selectedTask.id);
  };

  const handleFireCreateWithSave = async () => {
    if (!selectedTask) return;
    const saved = await saveCurrentChanges();
    if (!saved) {
      alert('タスクの保存に失敗しました。再度お試しください。');
      return;
    }
    await handleFireCreate(selectedTask.projectType, selectedTask.id);
  };

  const handleChatThreadCreateWithSave = async () => {
    if (!selectedTask) return;
    const saved = await saveCurrentChanges();
    if (!saved) {
      alert('タスクの保存に失敗しました。再度お試しください。');
      return;
    }
    await handleChatThreadCreate(selectedTask.projectType, selectedTask.id);
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
    } catch (error: unknown) {
      console.error('Delete task error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      alert(`タスクの削除に失敗しました: ${errorMessage}`);
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
          <ToggleButtonGroup
            value={dashboardViewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
          >
            <Tooltip title="テーブル表示">
              <ToggleButton value="table" aria-label="テーブル表示">
                <TableRowsIcon />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="カード表示">
              <ToggleButton value="card" aria-label="カード表示">
                <GridViewIcon />
              </ToggleButton>
            </Tooltip>
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
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            enableDnd={sortMode === 'order'}
            onDragEnd={handleDragEnd}
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
        open={!!selectedTaskId}
        onClose={handleDrawerClose}
        selectedTask={selectedTask}
        taskFormData={taskFormData}
        onTaskFormDataChange={setTaskFormData}
        onDelete={handleDeleteClick}
        isSaving={isSavingOnClose}
        taskLabels={taskLabels}
        allUsers={allUsers}
        activeSession={activeSession}
        onStartTimer={handleStartTimer}
        onStopTimer={handleStopTimer}
        isStoppingTimer={isStoppingTimer}
        onDriveCreate={handleDriveCreateWithSave}
        isCreatingDrive={isCreatingDrive}
        onFireCreate={handleFireCreateWithSave}
        isCreatingFire={isCreatingFire}
        onChatThreadCreate={handleChatThreadCreateWithSave}
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
