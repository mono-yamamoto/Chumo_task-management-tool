'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task, FlowStatus, User } from '@/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { useKubunLabels } from '@/lib/hooks/useKubunLabels';
import { useParams } from 'next/navigation';
import { useTimer } from '@/lib/hooks/useTimer';
import { useDriveIntegration, useFireIntegration } from '@/lib/hooks/useIntegrations';
import { Button as CustomButton } from '@/components/ui/button';
import {
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Link as MUILink,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  FolderOpen,
  LocalFireDepartment,
  Delete,
  Edit,
  Add,
} from '@mui/icons-material';
import { format } from 'date-fns';

const flowStatusOptions: FlowStatus[] = [
  '未着手',
  'ディレクション',
  'コーディング',
  'デザイン',
  '待ち',
  '対応中',
  '週次報告',
  '月次報告',
  '完了',
];

export default function TaskDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const taskId = params?.taskId as string;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(true); // デフォルトで編集モード
  const { startTimer, stopTimer } = useTimer();
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const [activeSession, setActiveSession] = useState<{
    projectId: string;
    taskId: string;
    sessionId: string;
  } | null>(null);
  // const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [sessionEditDialogOpen, setSessionEditDialogOpen] = useState(false);
  const [sessionAddDialogOpen, setSessionAddDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [sessionFormData, setSessionFormData] = useState({
    startedAt: '',
    startedAtTime: '',
    endedAt: '',
    endedAtTime: '',
    userId: '',
    note: '',
  });

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!db) return null;
      // まずプロジェクトIDを取得する必要がある
      // 簡略化のため、全プロジェクトから検索
      const projectsRef = collection(db, 'projects');
      const projectsSnapshot = await getDocs(projectsRef);

      for (const projectDoc of projectsSnapshot.docs) {
        const taskRef = doc(db, 'projects', projectDoc.id, 'tasks', taskId);
        const taskDoc = await getDoc(taskRef);
        if (taskDoc.exists()) {
          return {
            id: taskDoc.id,
            projectId: projectDoc.id,
            ...taskDoc.data(),
            createdAt: taskDoc.data().createdAt?.toDate(),
            updatedAt: taskDoc.data().updatedAt?.toDate(),
            itUpDate: taskDoc.data().itUpDate?.toDate() || null,
            releaseDate: taskDoc.data().releaseDate?.toDate() || null,
            dueDate: taskDoc.data().dueDate?.toDate() || null,
            completedAt: taskDoc.data().completedAt?.toDate() || null,
          } as Task & { projectId: string };
        }
      }
      return null;
    },
    enabled: !!taskId,
  });

  // 区分ラベルは全プロジェクト共通
  const { data: labels } = useKubunLabels();

  // すべてのユーザーを取得（セッション履歴のユーザー表示用）
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

  // アクティブなセッション（未終了）を取得
  // const { data: activeSessionData } = useQuery({
  //   queryKey: ['activeSession', taskId, user?.id],
  //   queryFn: async () => {
  //     if (!task?.projectId || !db || !user) return null;
  //     const sessionsRef = collection(
  //       db,
  //       'projects',
  //       task.projectId,
  //       'taskSessions',
  //     );
  //     const q = query(
  //       sessionsRef,
  //       where('taskId', '==', taskId),
  //       where('userId', '==', user.id),
  //       where('endedAt', '==', null),
  //     );
  //     const snapshot = await getDocs(q);
  //     if (!snapshot.empty) {
  //       const session = snapshot.docs[0];
  //       setActiveSession({
  //         projectId: task.projectId,
  //         taskId,
  //         sessionId: session.id,
  //       });
  //       return {
  //         id: session.id,
  //         ...session.data(),
  //         startedAt: session.data().startedAt?.toDate(),
  //         endedAt: null,
  //       };
  //     }
  //     setActiveSession(null);
  //     return null;
  //   },
  //   enabled: !!task?.projectId && !!taskId && !!user,
  // });

  // セッション履歴（すべてのユーザーの終了したセッションを含む）を取得
  const { data: sessions } = useQuery({
    queryKey: ['sessionHistory', taskId],
    queryFn: async () => {
      if (!task?.projectId || !db) return [];
      try {
        const sessionsRef = collection(db, 'projects', task.projectId, 'taskSessions');
        const q = query(sessionsRef, where('taskId', '==', taskId), orderBy('startedAt', 'desc'));
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
            const sessionsRef = collection(db, 'projects', task.projectId, 'taskSessions');
            const q = query(sessionsRef, where('taskId', '==', taskId));
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
              if (!a.startedAt || !b.startedAt) return 0;
              return b.startedAt.getTime() - a.startedAt.getTime();
            });
          } catch (retryError) {
            console.error('Failed to fetch sessions after retry:', retryError);
            return [];
          }
        }
        // エラーが発生した場合でも空配列を返してUIを壊さない
        console.error('Failed to fetch sessions:', error);
        return [];
      }
    },
    enabled: !!task && !!task.projectId && !!taskId && !taskLoading,
    retry: false, // エラー時に自動リトライしない（フォールバック処理で対応済み）
  });

  const handleStartTimer = async () => {
    if (!user || !task) return;
    try {
      await startTimer.mutateAsync({
        projectId: task.projectId,
        taskId: task.id,
        userId: user.id,
      });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['activeSession', taskId] });
      queryClient.invalidateQueries({ queryKey: ['sessionHistory', taskId] });
      queryClient.refetchQueries({ queryKey: ['activeSession', taskId, user.id] });
      queryClient.refetchQueries({ queryKey: ['sessionHistory', taskId] });
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
      queryClient.invalidateQueries({ queryKey: ['activeSession', taskId] });
      queryClient.invalidateQueries({ queryKey: ['sessionHistory', taskId] });
      queryClient.refetchQueries({ queryKey: ['activeSession', taskId, user?.id] });
      queryClient.refetchQueries({ queryKey: ['sessionHistory', taskId] });
    } catch (error: any) {
      console.error('Timer stop error:', error);
      alert(`タイマーの停止に失敗しました: ${error.message || '不明なエラー'}`);
    }
  };

  const handleDriveCreate = async () => {
    if (!task) return;
    try {
      const result = await createDriveFolder.mutateAsync({
        projectId: task.projectId,
        taskId: task.id,
      });
      // タスク詳細を更新（URLが反映されるように）
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.refetchQueries({ queryKey: ['task', taskId] });
      // タスク一覧も更新
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      if (result.warning) {
        // チェックシート作成エラーがある場合
        alert(
          `Driveフォルダを作成しましたが、チェックシートの作成に失敗しました。\n\nフォルダURL: ${result.url || '取得できませんでした'}\n\nエラー: ${result.error || '不明なエラー'}`
        );
      } else {
        // 完全に成功した場合
        alert(
          `Driveフォルダとチェックシートを作成しました。\n\nフォルダURL: ${result.url || '取得できませんでした'}`
        );
      }
    } catch (error: any) {
      console.error('Drive create error:', error);
      const errorMessage = error?.message || '不明なエラー';
      alert(`Driveフォルダの作成に失敗しました: ${errorMessage}`);
    }
  };

  const handleFireCreate = async () => {
    if (!task) return;
    try {
      await createFireIssue.mutateAsync({ projectId: task.projectId, taskId: task.id });
      alert('GitHub Issueを作成しました');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.refetchQueries({ queryKey: ['task', taskId] });
    } catch (error: any) {
      console.error('Fire create error:', error);
      alert(`GitHub Issueの作成に失敗しました: ${error.message || '不明なエラー'}`);
    }
  };

  // const handleDeleteTask = async () => {
  //   if (!task || !db) return;
  //
  //   // タイトルが一致しない場合は削除しない
  //   if (deleteConfirmTitle !== task.title) {
  //     alert('タイトルが一致しません。削除をキャンセルしました。');
  //     setDeleteDialogOpen(false);
  //     setDeleteConfirmTitle('');
  //     return;
  //   }
  //
  //   try {
  //     const taskRef = doc(db, 'projects', task.projectId, 'tasks', taskId);
  //     await deleteDoc(taskRef);
  //
  //     // タスク一覧を更新
  //     queryClient.invalidateQueries({ queryKey: ['tasks'] });
  //
  //     // タスク詳細ページから離れる（一覧ページにリダイレクト）
  //     window.location.href = '/tasks';
  //   } catch (error: any) {
  //     console.error('Delete task error:', error);
  //     alert(`タスクの削除に失敗しました: ${error.message || '不明なエラー'}`);
  //   } finally {
  //     setDeleteDialogOpen(false);
  //     setDeleteConfirmTitle('');
  //   }
  // };

  // セッション更新
  const updateSession = useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<any> }) => {
      if (!task?.projectId || !db) throw new Error('Task not found or Firestore not initialized');
      const sessionRef = doc(db, 'projects', task.projectId, 'taskSessions', sessionId);

      // startedAtとendedAtを更新する場合、durationSecも再計算
      const updateData: any = {};
      if (updates.startedAt) {
        updateData.startedAt = updates.startedAt;
      }
      if (updates.endedAt !== undefined) {
        updateData.endedAt = updates.endedAt;
      }
      if (updates.userId) {
        updateData.userId = updates.userId;
      }
      if (updates.note !== undefined) {
        updateData.note = updates.note;
      }

      // durationSecを再計算
      let startedAt: Date | undefined;
      if (updates.startedAt) {
        startedAt =
          updates.startedAt instanceof Date ? updates.startedAt : updates.startedAt.toDate();
      } else {
        startedAt = editingSession?.startedAt;
      }

      let endedAt: Date | null | undefined;
      if (updates.endedAt !== null && updates.endedAt !== undefined) {
        endedAt = updates.endedAt instanceof Date ? updates.endedAt : updates.endedAt.toDate();
      } else {
        endedAt = editingSession?.endedAt;
      }
      if (startedAt && endedAt) {
        updateData.durationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      }

      await updateDoc(sessionRef, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionHistory', taskId] });
      setSessionEditDialogOpen(false);
      setEditingSession(null);
    },
  });

  // セッション削除
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!task?.projectId || !db) throw new Error('Task not found or Firestore not initialized');
      const sessionRef = doc(db, 'projects', task.projectId, 'taskSessions', sessionId);
      await deleteDoc(sessionRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionHistory', taskId] });
    },
  });

  // セッション追加
  const addSession = useMutation({
    mutationFn: async (sessionData: any) => {
      if (!task?.projectId || !db) throw new Error('Task not found or Firestore not initialized');
      const sessionsRef = collection(db, 'projects', task.projectId, 'taskSessions');

      // startedAtとendedAtからdurationSecを計算
      let durationSec = 0;
      if (sessionData.startedAt && sessionData.endedAt) {
        durationSec = Math.floor(
          (sessionData.endedAt.getTime() - sessionData.startedAt.getTime()) / 1000
        );
      }

      await addDoc(sessionsRef, {
        ...sessionData,
        taskId: task.id,
        durationSec,
        startedAt: Timestamp.fromDate(sessionData.startedAt),
        endedAt: sessionData.endedAt ? Timestamp.fromDate(sessionData.endedAt) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionHistory', taskId] });
      setSessionAddDialogOpen(false);
      setSessionFormData({
        startedAt: '',
        startedAtTime: '',
        endedAt: '',
        endedAtTime: '',
        userId: '',
        note: '',
      });
    },
  });

  const handleEditSession = (session: any) => {
    setEditingSession(session);
    const startedAt = session.startedAt ? new Date(session.startedAt) : new Date();
    const endedAt = session.endedAt ? new Date(session.endedAt) : null;

    setSessionFormData({
      startedAt: format(startedAt, 'yyyy-MM-dd'),
      startedAtTime: format(startedAt, 'HH:mm'),
      endedAt: endedAt ? format(endedAt, 'yyyy-MM-dd') : '',
      endedAtTime: endedAt ? format(endedAt, 'HH:mm') : '',
      userId: session.userId,
      note: session.note || '',
    });
    setSessionEditDialogOpen(true);
  };

  const handleAddSession = () => {
    setEditingSession(null);
    const now = new Date();
    setSessionFormData({
      startedAt: format(now, 'yyyy-MM-dd'),
      startedAtTime: format(now, 'HH:mm'),
      endedAt: format(now, 'yyyy-MM-dd'),
      endedAtTime: format(now, 'HH:mm'),
      userId: user?.id || '',
      note: '',
    });
    setSessionAddDialogOpen(true);
  };

  const handleSaveSession = async () => {
    if (!sessionFormData.startedAt || !sessionFormData.startedAtTime) {
      alert('開始日時を入力してください');
      return;
    }

    const startedAt = new Date(`${sessionFormData.startedAt}T${sessionFormData.startedAtTime}`);
    const endedAt =
      sessionFormData.endedAt && sessionFormData.endedAtTime
        ? new Date(`${sessionFormData.endedAt}T${sessionFormData.endedAtTime}`)
        : null;

    if (endedAt && endedAt <= startedAt) {
      alert('終了時刻は開始時刻より後である必要があります');
      return;
    }

    if (editingSession) {
      // 更新
      await updateSession.mutateAsync({
        sessionId: editingSession.id,
        updates: {
          startedAt: Timestamp.fromDate(startedAt),
          endedAt: endedAt ? Timestamp.fromDate(endedAt) : null,
          userId: sessionFormData.userId,
          note: sessionFormData.note || null,
        },
      });
    } else {
      // 追加
      await addSession.mutateAsync({
        startedAt,
        endedAt,
        userId: sessionFormData.userId,
        note: sessionFormData.note || null,
      });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('このセッションを削除しますか？')) return;
    await deleteSession.mutateAsync(sessionId);
  };

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      if (!task?.projectId || !db) throw new Error('Task not found or Firestore not initialized');
      const taskRef = doc(db, 'projects', task.projectId, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      // クエリを無効化して即座に再取得
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.refetchQueries({ queryKey: ['task', taskId] });
      // タスク一覧も更新
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditing(false);
    },
  });

  if (taskLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!task) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>タスクが見つかりません</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          {task.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <CustomButton onClick={() => setEditing(!editing)}>
            {editing ? '保存' : '編集'}
          </CustomButton>
          <CustomButton
            variant="destructive"
            onClick={() => {
              // setDeleteDialogOpen(true);
            }}
          >
            <Delete fontSize="small" sx={{ mr: 1 }} />
            削除
          </CustomButton>
        </Box>
      </Box>

      {task.external && (
        <Card>
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 1 }}>
              Backlog情報
            </Typography>
            <MUILink
              href={task.external.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
            >
              {task.external.issueKey}
            </MUILink>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 2 }}>
                基本情報
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>ステータス</InputLabel>
                  {editing ? (
                    <Select
                      value={task.flowStatus}
                      onChange={(e) =>
                        updateTask.mutate({
                          flowStatus: e.target.value as FlowStatus,
                        })
                      }
                      label="ステータス"
                    >
                      {flowStatusOptions.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <Typography sx={{ mt: 1 }}>{task.flowStatus}</Typography>
                  )}
                </FormControl>
                <TextField
                  label="ITアップ日"
                  type="date"
                  value={task.itUpDate ? format(task.itUpDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    updateTask.mutate({
                      itUpDate: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                  disabled={!editing}
                  fullWidth
                />
                <TextField
                  label="リリース日"
                  type="date"
                  value={task.releaseDate ? format(task.releaseDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    updateTask.mutate({
                      releaseDate: e.target.value ? new Date(e.target.value) : null,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                  disabled={!editing}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>区分</InputLabel>
                  {editing ? (
                    <Select
                      value={task.kubunLabelId}
                      onChange={(e) => updateTask.mutate({ kubunLabelId: e.target.value })}
                      label="区分"
                    >
                      {labels?.map((label) => (
                        <MenuItem key={label.id} value={label.id}>
                          {label.name}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <Typography sx={{ mt: 1 }}>
                      {labels?.find((l) => l.id === task.kubunLabelId)?.name || '-'}
                    </Typography>
                  )}
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 2 }}>
                連携
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {activeSession?.taskId === task.id ? (
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      onClick={handleStopTimer}
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
                        <>
                          <CircularProgress size={16} sx={{ color: 'inherit', mr: 1 }} />
                          停止中...
                        </>
                      ) : (
                        <>
                          <Stop fontSize="small" sx={{ mr: 1 }} />
                          タイマー停止
                        </>
                      )}
                    </Button>
                  ) : (
                    <CustomButton
                      fullWidth
                      variant="outline"
                      onClick={handleStartTimer}
                      disabled={!!activeSession || startTimer.isPending}
                    >
                      {startTimer.isPending ? (
                        <>
                          <CircularProgress size={16} sx={{ color: 'inherit', mr: 1 }} />
                          開始中...
                        </>
                      ) : (
                        <>
                          <PlayArrow fontSize="small" sx={{ mr: 1 }} />
                          タイマー開始
                        </>
                      )}
                    </CustomButton>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {task.googleDriveUrl ? (
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={() => window.open(task.googleDriveUrl!, '_blank')}
                        sx={{ flex: 1 }}
                      >
                        <FolderOpen fontSize="small" sx={{ mr: 1 }} />
                        Driveを開く
                      </Button>
                    ) : (
                      <CustomButton
                        fullWidth
                        variant="outline"
                        onClick={handleDriveCreate}
                        disabled={createDriveFolder.isPending}
                        sx={{ flex: 1 }}
                      >
                        <FolderOpen fontSize="small" sx={{ mr: 1 }} />
                        Drive作成
                      </CustomButton>
                    )}
                    {task.fireIssueUrl ? (
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={() => window.open(task.fireIssueUrl!, '_blank')}
                        sx={{ flex: 1 }}
                      >
                        <LocalFireDepartment fontSize="small" sx={{ mr: 1 }} />
                        Issueを開く
                      </Button>
                    ) : (
                      <CustomButton
                        fullWidth
                        variant="outline"
                        onClick={handleFireCreate}
                        disabled={createFireIssue.isPending}
                        sx={{ flex: 1 }}
                      >
                        <LocalFireDepartment fontSize="small" sx={{ mr: 1 }} />
                        Issue作成
                      </CustomButton>
                    )}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold' }}>
              セッション履歴
            </Typography>
            <CustomButton variant="outline" onClick={handleAddSession}>
              <Add fontSize="small" sx={{ mr: 1 }} />
              追加
            </CustomButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sessions && sessions.length > 0 ? (
              sessions.map((session: any) => {
                const sessionUser = allUsers?.find((u) => u.id === session.userId);
                const formatDuration = (seconds: number | undefined | null) => {
                  // durationSecが0または無効な場合、開始時刻と終了時刻から計算
                  let secs = 0;
                  if (
                    seconds === undefined ||
                    seconds === null ||
                    Number.isNaN(seconds) ||
                    seconds === 0
                  ) {
                    if (session.endedAt && session.startedAt) {
                      secs = Math.floor(
                        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
                      );
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
                  }
                  if (minutes > 0) {
                    return `${minutes}分${remainingSecs}秒`;
                  }
                  return `${remainingSecs}秒`;
                };
                return (
                  <Box
                    key={session.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: 1,
                      borderColor: 'divider',
                      pb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                        flex: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {sessionUser?.displayName || '不明なユーザー'}
                      </Typography>
                      <Typography>
                        {format(session.startedAt, 'yyyy-MM-dd HH:mm:ss')}
                        {' - '}
                        {session.endedAt
                          ? format(session.endedAt, 'yyyy-MM-dd HH:mm:ss')
                          : '実行中'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        sx={{ fontWeight: 'medium', minWidth: '80px', textAlign: 'right' }}
                      >
                        {session.endedAt ? formatDuration(session.durationSec) : '-'}
                      </Typography>
                      {user?.id === session.userId && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button
                            size="small"
                            onClick={() => handleEditSession(session)}
                            sx={{ minWidth: 'auto', p: 0.5 }}
                          >
                            <Edit fontSize="small" />
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleDeleteSession(session.id)}
                            color="error"
                            sx={{ minWidth: 'auto', p: 0.5 }}
                            disabled={deleteSession.isPending}
                          >
                            <Delete fontSize="small" />
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })
            ) : (
              <Typography sx={{ color: 'text.secondary', py: 2 }}>
                セッション履歴がありません
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* セッション編集ダイアログ */}
      <Dialog
        open={sessionEditDialogOpen || sessionAddDialogOpen}
        onClose={() => {
          setSessionEditDialogOpen(false);
          setSessionAddDialogOpen(false);
          setEditingSession(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingSession ? 'セッション編集' : 'セッション追加'}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              pt: 2,
            }}
          >
            <FormControl fullWidth>
              <InputLabel>ユーザー</InputLabel>
              <Select
                value={sessionFormData.userId}
                onChange={(e) => setSessionFormData({ ...sessionFormData, userId: e.target.value })}
                label="ユーザー"
              >
                {allUsers?.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.displayName || u.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="開始日"
                type="date"
                value={sessionFormData.startedAt}
                onChange={(e) => {
                  setSessionFormData({ ...sessionFormData, startedAt: e.target.value });
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="開始時刻"
                type="time"
                value={sessionFormData.startedAtTime}
                onChange={(e) => {
                  setSessionFormData({ ...sessionFormData, startedAtTime: e.target.value });
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="終了日"
                type="date"
                value={sessionFormData.endedAt}
                onChange={(e) => {
                  setSessionFormData({ ...sessionFormData, endedAt: e.target.value });
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="終了時刻"
                type="time"
                value={sessionFormData.endedAtTime}
                onChange={(e) => {
                  setSessionFormData({ ...sessionFormData, endedAtTime: e.target.value });
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            <TextField
              label="メモ"
              multiline
              rows={3}
              value={sessionFormData.note}
              onChange={(e) => setSessionFormData({ ...sessionFormData, note: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSessionEditDialogOpen(false);
              setSessionAddDialogOpen(false);
              setEditingSession(null);
            }}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSaveSession}
            variant="contained"
            disabled={updateSession.isPending || addSession.isPending}
          >
            {editingSession ? '更新' : '追加'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
