'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task } from '@/types';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useUpdateTask } from '@/hooks/useTasks';
import { useActiveSession, useTaskSessions } from '@/hooks/useTaskSessions';
import { useTimer } from '@/hooks/useTimer';
import { useDriveIntegration, useFireIntegration, useGoogleChatIntegration } from '@/hooks/useIntegrations';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { formatDuration as formatDurationUtil } from '@/utils/timer';
import { Button as CustomButton } from '@/components/ui/button';
import { buildTaskDetailUrl } from '@/utils/taskLinks';
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

function DashboardPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFormData, setTaskFormData] = useState<Partial<Task> | null>(null);
  const { startTimer, stopTimer } = useTimer();
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const { createGoogleChatThread } = useGoogleChatIntegration();
  const [activeSession, setActiveSession] = useState<{
    projectType: string;
    taskId: string;
    sessionId: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectType, setDeleteProjectType] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');

  // 自分のタスクかつ完了以外のタスクを取得
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['dashboard-tasks', user?.id],
    queryFn: async () => {
      if (!db || !user) return [];

      const allTasks: (Task & { projectType: ProjectType })[] = [];

      // すべてのプロジェクトタイプからタスクを取得
      for (const projectType of PROJECT_TYPES) {
        const tasksRef = collection(db, 'projects', projectType, 'tasks');
        const tasksSnapshot = await getDocs(tasksRef);

        tasksSnapshot.docs.forEach((docItem) => {
          const taskData = {
            id: docItem.id,
            projectType,
            ...docItem.data(),
            createdAt: docItem.data().createdAt?.toDate(),
            updatedAt: docItem.data().updatedAt?.toDate(),
            itUpDate: docItem.data().itUpDate?.toDate() || null,
            releaseDate: docItem.data().releaseDate?.toDate() || null,
            dueDate: docItem.data().dueDate?.toDate() || null,
            completedAt: docItem.data().completedAt?.toDate() || null,
          } as Task & { projectType: ProjectType };

          // 自分のタスクかつ完了以外のもののみを追加
          if (taskData.assigneeIds.includes(user.id) && taskData.flowStatus !== '完了') {
            allTasks.push(taskData);
          }
        });
      }

      return allTasks;
    },
    enabled: !!user && !!db,
  });

  // すべてのユーザーを取得（アサイン表示用）
  const { data: allUsers } = useUsers();

  // 区分ラベルは全プロジェクト共通
  const { data: allLabels } = useKubunLabels();

  // アクティブなセッションを取得（すべてのプロジェクトタイプから）
  useActiveSession(user?.id || null, setActiveSession);

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

  // 選択されたタスクの詳細を取得
  const selectedTask = useMemo(
    () => sortedTasks?.find((t) => t.id === selectedTaskId) || null,
    [sortedTasks, selectedTaskId]
  );

  // 選択されたタスクが変更されたらフォームデータを初期化
  useEffect(() => {
    if (selectedTask && selectedTaskId) {
      if (!taskFormData || (taskFormData && selectedTask.id === selectedTaskId)) {
        setTaskFormData({
          title: selectedTask.title,
          description: selectedTask.description || '',
          flowStatus: selectedTask.flowStatus,
          kubunLabelId: selectedTask.kubunLabelId,
          assigneeIds: selectedTask.assigneeIds,
          itUpDate: selectedTask.itUpDate,
          releaseDate: selectedTask.releaseDate,
          dueDate: selectedTask.dueDate,
        });
      }
    } else if (!selectedTaskId) {
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

  const updateTask = useUpdateTask();

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    const task = sortedTasks?.find((t) => t.id === taskId);
    if (task) {
      setTaskFormData({
        title: task.title,
        description: task.description || '',
        flowStatus: task.flowStatus,
        kubunLabelId: task.kubunLabelId,
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['dashboard-tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['dashboard-tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
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

      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['dashboard-tasks'] });

      if (selectedTaskId === deleteTaskId) {
        setSelectedTaskId(null);
        setTaskFormData(null);
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
          isStartingTimer={startTimer.isPending}
          isStoppingTimer={stopTimer.isPending}
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
