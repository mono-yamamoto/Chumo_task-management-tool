'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import { FlowStatus, TaskSession } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useUsers } from '@/hooks/useUsers';
import { useTask, useUpdateTask } from '@/hooks/useTasks';
import {
  useTaskSessions,
  useAddSession,
  useUpdateSession,
  useDeleteSession,
} from '@/hooks/useTaskSessions';
import { useParams } from 'next/navigation';
import { useTimerActions } from '@/hooks/useTimerActions';
import {
  useDriveIntegration,
  useFireIntegration,
  useGoogleChatIntegration,
} from '@/hooks/useIntegrations';
import { FLOW_STATUS_OPTIONS } from '@/constants/taskConstants';
import { formatDuration as formatDurationUtil } from '@/utils/timer';
import { Button as CustomButton } from '@/components/ui/button';
import { TaskTimerButton } from '@/components/tasks/TaskTimerButton';
import { generateBacklogUrlFromTitle, parseBacklogClipboard } from '@/utils/backlog';
import { buildTaskDetailUrl } from '@/utils/taskLinks';
import { queryKeys } from '@/lib/queryKeys';
import { fetchActiveSessionForTask } from '@/lib/firestore/repositories/sessionRepository';
import { useTaskStore } from '@/stores/taskStore';
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
  FolderOpen,
  LocalFireDepartment,
  ChatBubbleOutline,
  Delete,
  Edit,
  Add,
} from '@mui/icons-material';
import { format } from 'date-fns';

export default function TaskDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const taskId = params?.taskId as string;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(true); // デフォルトで編集モード
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const { createGoogleChatThread } = useGoogleChatIntegration();

  // Zustandのグローバル状態を使用
  const { activeSession, setActiveSession } = useTaskStore();

  // 依存配列の安定化のため、extraInvalidateKeysとextraRefetchKeysをuseMemoでメモ化
  const extraInvalidateKeys = useMemo(() => {
    return [queryKeys.activeSession(user?.id ?? null, taskId), queryKeys.sessionHistory(taskId)];
  }, [taskId, user]);

  const extraRefetchKeys = useMemo(
    () =>
      user?.id
        ? [queryKeys.activeSession(user.id, taskId), queryKeys.sessionHistory(taskId)]
        : [queryKeys.sessionHistory(taskId)],
    [taskId, user]
  );

  const { stopTimer, startTimerWithOptimistic, stopActiveSession } = useTimerActions({
    userId: user?.id,
    queryClient,
    setActiveSession,
    extraInvalidateKeys,
    extraRefetchKeys,
  });

  const [sessionEditDialogOpen, setSessionEditDialogOpen] = useState(false);
  const [sessionAddDialogOpen, setSessionAddDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TaskSession | null>(null);
  const [sessionFormData, setSessionFormData] = useState({
    startedAt: '',
    startedAtTime: '',
    endedAt: '',
    endedAtTime: '',
    userId: '',
    note: '',
  });

  // タスク詳細を取得
  const { data: task, isLoading: taskLoading } = useTask(taskId);

  // 区分ラベルは全プロジェクト共通
  const { data: labels } = useKubunLabels();

  // 「個別」ラベルのIDを取得（将来使用予定）
  const _kobetsuLabelId = useMemo(() => {
    return labels?.find((label) => label.name === '個別')?.id || null;
  }, [labels]);

  // すべてのユーザーを取得（セッション履歴のユーザー表示用）
  const { data: allUsers } = useUsers();

  // アクティブなセッション（未終了）を取得
  // タスク固有のアクティブセッションを取得するため、カスタムクエリを使用
  useQuery({
    queryKey: queryKeys.activeSession(user?.id ?? null, taskId),
    queryFn: async () => {
      if (!task?.projectType || !user) return null;
      const activeSessionInfo = await fetchActiveSessionForTask({
        projectType: task.projectType,
        taskId,
        userId: user.id,
      });
      if (activeSessionInfo) {
        setActiveSession({
          projectType: activeSessionInfo.projectType,
          taskId,
          sessionId: activeSessionInfo.sessionId,
        });
        return activeSessionInfo.session;
      }
      setActiveSession(null);
      return null;
    },
    enabled: !!task?.projectType && !!taskId && !!user,
    refetchInterval: 5000, // 5秒ごとに再取得して、リアルタイムで状態を更新
  });

  // セッション履歴を取得
  const { data: sessions } = useTaskSessions(task?.projectType || null, taskId);

  // セッション関連のmutation
  const addSession = useAddSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const handleStartTimer = async () => {
    if (!user || !task) return;
    await startTimerWithOptimistic(task.projectType, task.id);
  };

  const handleStopTimer = async () => {
    await stopActiveSession(activeSession);
  };

  const handleDriveCreate = async () => {
    if (!task) return;
    try {
      const result = await createDriveFolder.mutateAsync({
        projectType: task.projectType,
        taskId: task.id,
      });
      // タスク詳細を更新（URLが反映されるように）
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.refetchQueries({ queryKey: queryKeys.task(taskId) });
      // タスク一覧も更新
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });

      if (result.warning) {
        // チェックシート作成エラーがある場合（警告として表示）
        alert(
          `Driveフォルダを作成しましたが、チェックシートの作成に失敗しました。\n\nフォルダURL: ${result.url || '取得できませんでした'}\n\nエラー: ${result.error || '不明なエラー'}`
        );
      }
      // 完全に成功した場合はalertを表示しない
    } catch (error: unknown) {
      console.error('Drive create error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      alert(`Driveフォルダの作成に失敗しました: ${errorMessage}`);
    }
  };

  const handleFireCreate = async () => {
    if (!task) return;
    try {
      await createFireIssue.mutateAsync({ projectType: task.projectType, taskId: task.id });
      // 成功時はalertを表示しない
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.refetchQueries({ queryKey: queryKeys.task(taskId) });
    } catch (error: unknown) {
      console.error('Fire create error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      alert(`GitHub Issueの作成に失敗しました: ${errorMessage}`);
    }
  };

  const handleChatThreadCreate = async () => {
    if (!task) return;
    try {
      const taskUrl = buildTaskDetailUrl(task.id);
      if (!taskUrl) {
        alert('タスクのURLを生成できませんでした。');
        return;
      }

      await createGoogleChatThread.mutateAsync({
        projectType: task.projectType,
        taskId: task.id,
        taskUrl,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.refetchQueries({ queryKey: queryKeys.task(taskId) });
    } catch (error: unknown) {
      console.error('Chat thread create error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      alert(`Google Chatスレッドの作成に失敗しました: ${errorMessage}`);
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

  const handleEditSession = (session: TaskSession) => {
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

    if (!task?.projectType) {
      alert('タスク情報が取得できませんでした');
      return;
    }

    if (editingSession) {
      // 更新
      await updateSession.mutateAsync({
        projectType: task.projectType,
        sessionId: editingSession.id,
        updates: {
          startedAt: Timestamp.fromDate(startedAt),
          endedAt: endedAt ? Timestamp.fromDate(endedAt) : null,
          userId: sessionFormData.userId,
          note: sessionFormData.note || null,
        },
        existingSession: editingSession,
      });
      setSessionEditDialogOpen(false);
      setEditingSession(null);
    } else {
      // 追加
      await addSession.mutateAsync({
        projectType: task.projectType,
        sessionData: {
          taskId: task.id,
          startedAt,
          endedAt,
          userId: sessionFormData.userId,
          note: sessionFormData.note || null,
        },
      });
      setSessionAddDialogOpen(false);
      setSessionFormData({
        startedAt: '',
        startedAtTime: '',
        endedAt: '',
        endedAtTime: '',
        userId: '',
        note: '',
      });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('このセッションを削除しますか？')) return;
    if (!task?.projectType) return;
    await deleteSession.mutateAsync({
      projectType: task.projectType,
      sessionId,
      taskId: task.id,
    });
  };

  const updateTask = useUpdateTask();

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

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'semibold', mb: 2 }}>
            Backlog情報
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(() => {
              // バックログURLを取得（優先順位: backlogUrl > external.url > タイトルから生成）
              const backlogUrl =
                task.backlogUrl || task.external?.url || generateBacklogUrlFromTitle(task.title);
              const issueKey = task.external?.issueKey || null;

              if (backlogUrl) {
                return (
                  <MUILink
                    href={backlogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {issueKey || backlogUrl}
                  </MUILink>
                );
              }
              return null;
            })()}
            {editing && (
              <TextField
                fullWidth
                label="バックログURL"
                value={task.backlogUrl || ''}
                onBlur={(e) => {
                  if (!task?.projectType) return;
                  updateTask.mutate({
                    projectType: task.projectType,
                    taskId: task.id,
                    updates: {
                      backlogUrl: e.target.value || null,
                    },
                  });
                }}
                placeholder="https://ss-pj.jp/backlog/view/REG2017-2229"
                helperText="バックログのURLを手動で入力できます。バックログからコピーした内容を貼り付けることもできます。"
                size="small"
                onPaste={async (e) => {
                  const clipboardText = e.clipboardData.getData('text');
                  const parsed = parseBacklogClipboard(clipboardText);

                  if (parsed && task?.projectType) {
                    e.preventDefault();
                    // タイトルとURLを自動的に反映
                    updateTask.mutate({
                      projectType: task.projectType,
                      taskId: task.id,
                      updates: {
                        title: parsed.title,
                        backlogUrl: parsed.url,
                      },
                    });
                  }
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

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
                      onChange={(e) => {
                        if (!task?.projectType) return;
                        updateTask.mutate({
                          projectType: task.projectType,
                          taskId: task.id,
                          updates: {
                            flowStatus: e.target.value as FlowStatus,
                          },
                        });
                      }}
                      label="ステータス"
                    >
                      {FLOW_STATUS_OPTIONS.map((status) => (
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
                  onChange={(e) => {
                    if (!task?.projectType) return;
                    updateTask.mutate({
                      projectType: task.projectType,
                      taskId: task.id,
                      updates: {
                        itUpDate: e.target.value ? new Date(e.target.value) : null,
                      },
                    });
                  }}
                  InputLabelProps={{ shrink: true }}
                  disabled={!editing}
                  fullWidth
                />
                <TextField
                  label="リリース日"
                  type="date"
                  value={task.releaseDate ? format(task.releaseDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    if (!task?.projectType) return;
                    updateTask.mutate({
                      projectType: task.projectType,
                      taskId: task.id,
                      updates: {
                        releaseDate: e.target.value ? new Date(e.target.value) : null,
                      },
                    });
                  }}
                  InputLabelProps={{ shrink: true }}
                  disabled={!editing}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>区分</InputLabel>
                  {editing ? (
                    <Select
                      value={task.kubunLabelId || ''}
                      onChange={(e) => {
                        if (!task?.projectType) return;
                        updateTask.mutate({
                          projectType: task.projectType,
                          taskId: task.id,
                          updates: { kubunLabelId: e.target.value },
                        });
                      }}
                      label="区分"
                      disabled={!labels || labels.length === 0}
                    >
                      {!labels || labels.length === 0 ? (
                        <MenuItem value="" disabled>
                          区分ラベルが設定されていません
                        </MenuItem>
                      ) : (
                        labels.map((label) => (
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
                        ))
                      )}
                    </Select>
                  ) : (
                    <Typography sx={{ mt: 1 }}>
                      {labels?.find((l) => l.id === task.kubunLabelId)?.name || '-'}
                    </Typography>
                  )}
                </FormControl>
                <TextField
                  label="3時間超過理由"
                  value={task.over3Reason || ''}
                  onBlur={(e) => {
                    if (!task?.projectType) return;
                    updateTask.mutate({
                      projectType: task.projectType,
                      taskId: task.id,
                      updates: {
                        over3Reason: e.target.value || undefined,
                      },
                    });
                  }}
                  variant="outlined"
                  multiline
                  rows={3}
                  disabled={!editing}
                  fullWidth
                  helperText="タスクの作業時間が3時間を超過する場合の理由を記入してください"
                />
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
                  <TaskTimerButton
                    isActive={activeSession?.taskId === task.id}
                    onStart={handleStartTimer}
                    onStop={handleStopTimer}
                    isStopping={stopTimer.isPending}
                    startDisabled={!!activeSession}
                    fullWidth
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
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
                  {task.googleChatThreadUrl ? (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={() => window.open(task.googleChatThreadUrl!, '_blank')}
                      sx={{ flex: 1 }}
                    >
                      <ChatBubbleOutline fontSize="small" sx={{ mr: 1 }} />
                      Chatを開く
                    </Button>
                  ) : (
                    <CustomButton
                      fullWidth
                      variant="outline"
                      onClick={handleChatThreadCreate}
                      disabled={createGoogleChatThread.isPending}
                      sx={{ flex: 1 }}
                    >
                      <ChatBubbleOutline fontSize="small" sx={{ mr: 1 }} />
                      Chatスレッド作成
                    </CustomButton>
                  )}
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
              sessions.map((session: TaskSession) => {
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
                  return formatDurationUtil(secs);
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
