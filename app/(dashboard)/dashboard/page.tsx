'use client';

import {
  useState, Suspense, useMemo, useEffect,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection, getDocs, query, where, doc, updateDoc, deleteDoc, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Task, FlowStatus, User, Label, Project,
} from '@/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTimer } from '@/lib/hooks/useTimer';
import { useDriveIntegration, useFireIntegration } from '@/lib/hooks/useIntegrations';
import { Button as CustomButton } from '@/components/ui/button';
import {
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  PlayArrow, Stop,
} from '@mui/icons-material';
import { TaskDetailDrawer } from '@/components/Drawer/TaskDetailDrawer';
import { format, ja } from 'date-fns';

// const flowStatusOptions: FlowStatus[] = [
//   '未着手',
//   'ディレクション',
//   'コーディング',
//   'デザイン',
//   '待ち',
//   '対応中',
//   '週次報告',
//   '月次報告',
//   '完了',
// ];

const flowStatusLabels: Record<FlowStatus, string> = {
  未着手: '未着手',
  ディレクション: 'ディレクション',
  コーディング: 'コーディング',
  デザイン: 'デザイン',
  待ち: '待ち',
  対応中: '対応中',
  週次報告: '週次報告',
  月次報告: '月次報告',
  完了: '完了',
};

function DashboardPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFormData, setTaskFormData] = useState<Partial<Task> | null>(null);
  const { startTimer, stopTimer } = useTimer();
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const [activeSession, setActiveSession] = useState<{
    projectId: string;
    taskId: string;
    sessionId: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  // const [sessionEditDialogOpen, setSessionEditDialogOpen] = useState(false);
  // const [sessionAddDialogOpen, setSessionAddDialogOpen] = useState(false);
  // const [editingSession, setEditingSession] = useState<any | null>(null);
  // const [sessionFormData, setSessionFormData] = useState({
  //   startedAt: '',
  //   startedAtTime: '',
  //   endedAt: '',
  //   endedAtTime: '',
  //   userId: '',
  //   note: '',
  // });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!user || !db) return [];
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, where('memberIds', 'array-contains', user.id));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
        createdAt: docItem.data().createdAt?.toDate(),
        updatedAt: docItem.data().updatedAt?.toDate(),
      })) as Project[];
    },
    enabled: !!user && !!db,
  });

  // 自分のタスクかつ完了以外のタスクを取得
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['dashboard-tasks', user?.id],
    queryFn: async () => {
      if (!db || !user || !projects) return [];

      const allTasks: (Task & { projectId: string })[] = [];

      for (const project of projects) {
        const projectId = project.id;
        const tasksRef = collection(db, 'projects', projectId, 'tasks');
        const tasksSnapshot = await getDocs(tasksRef);

        tasksSnapshot.docs.forEach((docItem) => {
          const taskData = {
            id: docItem.id,
            projectId,
            ...docItem.data(),
            createdAt: docItem.data().createdAt?.toDate(),
            updatedAt: docItem.data().updatedAt?.toDate(),
            itUpDate: docItem.data().itUpDate?.toDate() || null,
            releaseDate: docItem.data().releaseDate?.toDate() || null,
            dueDate: docItem.data().dueDate?.toDate() || null,
            completedAt: docItem.data().completedAt?.toDate() || null,
          } as Task & { projectId: string };

          // 自分のタスクかつ完了以外のもののみを追加
          if (
            taskData.assigneeIds.includes(user.id)
            && taskData.flowStatus !== '完了'
          ) {
            allTasks.push(taskData);
          }
        });
      }

      return allTasks;
    },
    enabled: !!user && !!db && !!projects && projects.length > 0,
  });

  // すべてのユーザーを取得（アサイン表示用）
  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!db) return [];
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as User[];
    },
    enabled: !!db,
  });

  // すべてのラベルを取得（区分表示用）
  const { data: allLabels } = useQuery({
    queryKey: ['allLabels'],
    queryFn: async () => {
      if (!db || !projects) return [];
      const projectIds = projects.map((p: any) => p.id);
      const labelsRef = collection(db, 'labels');
      const labels: Label[] = [];

      for (const projectId of projectIds) {
        const q = query(labelsRef, where('projectId', '==', projectId));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((docItem) => {
          labels.push({
            id: docItem.id,
            ...docItem.data(),
            createdAt: docItem.data().createdAt?.toDate(),
            updatedAt: docItem.data().updatedAt?.toDate(),
          } as Label);
        });
      }

      return labels;
    },
    enabled: !!db && !!projects && projects.length > 0,
  });

  // アクティブなセッションを取得（すべてのプロジェクトから）
  // const { data: sessions } = useQuery({
  //   queryKey: ['sessions', user?.id],
  //   queryFn: async () => {
  //     if (!user || !db || !projects) return [];
  //     const allSessions: any[] = [];
  //
  //     for (const project of projects) {
  //       const sessionsRef = collection(db, 'projects', project.id, 'taskSessions');
  //       const q = query(
  //         sessionsRef,
  //         where('userId', '==', user.id),
  //         where('endedAt', '==', null),
  //       );
  //       const snapshot = await getDocs(q);
  //       snapshot.docs.forEach((docItem) => {
  //         allSessions.push({
  //           id: docItem.id,
  //           projectId: project.id,
  //           ...docItem.data(),
  //         });
  //       });
  //     }
  //
  //     if (allSessions.length > 0) {
  //       const session = allSessions[0];
  //       setActiveSession({
  //         projectId: session.projectId,
  //         taskId: session.taskId,
  //       sessionId: session.id,
  //     });
  //   } else {
  //     setActiveSession(null);
  //   }
  //
  //   return allSessions;
  // },
  // enabled: !!user && !!projects && projects.length > 0,
  // });

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
    [sortedTasks, selectedTaskId],
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
  }, [selectedTask?.id, selectedTaskId]);

  // 選択されたタスクのプロジェクトのラベルを取得
  const taskLabels = useMemo(() => {
    if (!selectedTask || !allLabels) return [];
    return allLabels.filter((l) => l.projectId === selectedTask.projectId);
  }, [selectedTask, allLabels]);

  // 選択されたタスクのセッション履歴を取得
  const { data: taskSessions } = useQuery({
    queryKey: ['taskSessions', selectedTaskId],
    queryFn: async () => {
      if (!selectedTask?.projectId || !db || !selectedTaskId) return [];
      try {
        const sessionsRef = collection(
          db,
          'projects',
          selectedTask.projectId,
          'taskSessions',
        );
        const q = query(
          sessionsRef,
          where('taskId', '==', selectedTaskId),
          orderBy('startedAt', 'desc'),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            id: docItem.id,
            ...data,
            startedAt: data.startedAt?.toDate(),
            endedAt: data.endedAt?.toDate() || null,
            durationSec: data.durationSec ?? 0,
          };
        });
      } catch (error: any) {
        // インデックスエラーの場合、orderByなしで再試行
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          try {
            const sessionsRef = collection(
              db,
              'projects',
              selectedTask.projectId,
              'taskSessions',
            );
            const q = query(
              sessionsRef,
              where('taskId', '==', selectedTaskId),
            );
            const snapshot = await getDocs(q);
            const taskSessionsData = snapshot.docs.map((docItem) => {
              const data = docItem.data();
              return {
                id: docItem.id,
                ...data,
                startedAt: data.startedAt?.toDate(),
                endedAt: data.endedAt?.toDate() || null,
                durationSec: data.durationSec ?? 0,
              };
            });
            // クライアント側でソート
            return taskSessionsData.sort((a, b) => {
              const aTime = a.startedAt?.getTime() || 0;
              const bTime = b.startedAt?.getTime() || 0;
              return bTime - aTime;
            });
          } catch (retryError) {
            console.error('Error fetching sessions:', retryError);
            return [];
          }
        }
        console.error('Error fetching sessions:', error);
        return [];
      }
    },
    enabled: !!selectedTask?.projectId && !!selectedTaskId,
  });

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      if (!selectedTask || !db) throw new Error('Task not found');
      const taskRef = doc(db, 'projects', selectedTask.projectId, 'tasks', selectedTask.id);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['dashboard-tasks'] });
    },
  });

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
    updateTask.mutate(taskFormData);
  };

  const formatDuration = (
    seconds: number | undefined | null,
    startedAt?: Date,
    endedAt?: Date | null,
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

    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;
    if (hours > 0) {
      return `${hours}時間${minutes}分${remainingSecs}秒`;
    } if (minutes > 0) {
      return `${minutes}分${remainingSecs}秒`;
    }
    return `${remainingSecs}秒`;
  };

  const handleStartTimer = async (projectId: string, taskId: string) => {
    if (!user) return;
    try {
      await startTimer.mutateAsync({
        projectId,
        taskId,
        userId: user.id,
      });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.refetchQueries({ queryKey: ['sessions', user.id] });
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
        projectId: activeSession.projectId,
        sessionId: activeSession.sessionId,
      });
      setActiveSession(null);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.refetchQueries({ queryKey: ['sessions', user?.id] });
    } catch (error: any) {
      console.error('Timer stop error:', error);
      alert(`タイマーの停止に失敗しました: ${error.message || '不明なエラー'}`);
    }
  };

  const handleDriveCreate = async (projectId: string, taskId: string) => {
    try {
      const result = await createDriveFolder.mutateAsync({ projectId, taskId });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.refetchQueries({ queryKey: ['task', taskId] });

      if (result.warning) {
        alert(`Driveフォルダを作成しましたが、チェックシートの作成に失敗しました。\n\nフォルダURL: ${result.url || '取得できませんでした'}\n\nエラー: ${result.error || '不明なエラー'}`);
      } else {
        alert(`Driveフォルダとチェックシートを作成しました。\n\nフォルダURL: ${result.url || '取得できませんでした'}`);
      }
    } catch (error: any) {
      console.error('Drive create error:', error);
      const errorMessage = error?.message || '不明なエラー';
      alert(`Driveフォルダの作成に失敗しました: ${errorMessage}`);
    }
  };

  const handleFireCreate = async (projectId: string, taskId: string) => {
    try {
      await createFireIssue.mutateAsync({ projectId, taskId });
      alert('GitHub Issueを作成しました');
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['dashboard-tasks'] });
    } catch (error: any) {
      console.error('Fire create error:', error);
      alert(`GitHub Issueの作成に失敗しました: ${error.message || '不明なエラー'}`);
    }
  };

  const handleDeleteClick = (taskId: string, projectId: string) => {
    setDeleteTaskId(taskId);
    setDeleteProjectId(projectId);
    setDeleteDialogOpen(true);
    setDeleteConfirmTitle('');
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId || !deleteProjectId || !db) return;

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
      const taskRef = doc(db, 'projects', deleteProjectId, 'tasks', deleteTaskId);
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
      setDeleteProjectId(null);
      setDeleteConfirmTitle('');
    }
  };

  const getAssigneeNames = (assigneeIds: string[]) => {
    if (!allUsers || assigneeIds.length === 0) return '-';
    return assigneeIds
      .map((id) => allUsers.find((u) => u.id === id)?.displayName)
      .filter(Boolean)
      .join(', ') || '-';
  };

  const getLabelName = (labelId: string) => {
    if (!allLabels || !labelId) return '-';
    return allLabels.find((l) => l.id === labelId)?.name || labelId;
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

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>タイトル</TableCell>
                <TableCell>プロジェクト</TableCell>
                <TableCell>アサイン</TableCell>
                <TableCell>ITアップ</TableCell>
                <TableCell>リリース</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>区分</TableCell>
                <TableCell>ロールアップ</TableCell>
                <TableCell>タイマー</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTasks && sortedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      自分のタスクがありません
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sortedTasks?.map((task) => {
                  const isActive = activeSession?.taskId === task.id;
                  return (
                    <TableRow
                      key={task.id}
                      onClick={() => handleTaskSelect(task.id)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        ...(isActive && { bgcolor: 'rgba(76, 175, 80, 0.08)', '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.12)' } }),
                      }}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: 'medium' }}>{task.title}</Typography>
                      </TableCell>
                      <TableCell>
                        {projects?.find((p) => p.id === task.projectId)?.name || '-'}
                      </TableCell>
                      <TableCell>{getAssigneeNames(task.assigneeIds)}</TableCell>
                      <TableCell>
                        {task.itUpDate ? format(task.itUpDate, 'yyyy-MM-dd', { locale: ja }) : '-'}
                      </TableCell>
                      <TableCell>
                        {task.releaseDate ? format(task.releaseDate, 'yyyy-MM-dd', { locale: ja }) : '-'}
                      </TableCell>
                      <TableCell>{flowStatusLabels[task.flowStatus]}</TableCell>
                      <TableCell>{getLabelName(task.kubunLabelId)}</TableCell>
                      <TableCell>
                        {isActive && <Chip label="稼働中" color="success" size="small" />}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isActive ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopTimer();
                            }}
                            disabled={stopTimer.isPending}
                            sx={{
                              animation: stopTimer.isPending ? 'none' : 'pulse 2s ease-in-out infinite',
                              '@keyframes pulse': {
                                '0%, 100%': {
                                  opacity: 1,
                                },
                                '50%': {
                                  opacity: 0.8,
                                },
                              },
                            }}
                          >
                            {stopTimer.isPending ? (
                              <CircularProgress size={16} sx={{ color: 'inherit' }} />
                            ) : (
                              <Stop fontSize="small" />
                            )}
                          </Button>
                        ) : (
                          <CustomButton
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTimer(task.projectId, task.id);
                            }}
                            disabled={
                              (!!activeSession && activeSession.taskId !== task.id)
                              || startTimer.isPending
                            }
                          >
                            {startTimer.isPending ? (
                              <CircularProgress size={14} sx={{ color: 'inherit' }} />
                            ) : (
                              <PlayArrow fontSize="small" />
                            )}
                          </CustomButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
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
            placeholder={sortedTasks?.find((t) => t.id === deleteTaskId)?.title || ''}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <CustomButton onClick={() => {
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
  return (
    <Suspense
      fallback={(
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
    >
      <DashboardPageContent />
    </Suspense>
  );
}
