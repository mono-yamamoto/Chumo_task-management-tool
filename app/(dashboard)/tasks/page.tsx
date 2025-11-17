'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task, FlowStatus, User } from '@/types';
import { useKubunLabels } from '@/hooks/useKubunLabels';
import { useAuth } from '@/hooks/useAuth';
import { useTimer } from '@/hooks/useTimer';
import { useDriveIntegration, useFireIntegration } from '@/hooks/useIntegrations';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { formatDuration as formatDurationUtil } from '@/utils/timer';
import { Button as CustomButton } from '@/components/ui/button';
import {
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Grid,
} from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
import Link from 'next/link';
import { format } from 'date-fns';
import { TaskDetailDrawer } from '@/components/drawer/TaskDetailDrawer';

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

function TasksPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | 'all'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskFormData, setTaskFormData] = useState<Partial<Task> | null>(null);
  const { startTimer, stopTimer } = useTimer();
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const [activeSession, setActiveSession] = useState<{
    projectType: string;
    taskId: string;
    sessionId: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteProjectType, setDeleteProjectType] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  // フィルタリング用のstate
  const [filterStatus, setFilterStatus] = useState<FlowStatus | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterLabel, setFilterLabel] = useState<string>('all');
  const [filterTimerActive, setFilterTimerActive] = useState<string>('all');
  const [filterItUpDateMonth, setFilterItUpDateMonth] = useState<string>('');
  const [filterReleaseDateMonth, setFilterReleaseDateMonth] = useState<string>('');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', selectedProjectType],
    queryFn: async () => {
      if (!db || !user) return [];

      if (selectedProjectType === 'all') {
        const allTasks: (Task & { projectType: ProjectType })[] = [];

        // すべてのプロジェクトタイプからタスクを取得
        for (const projectType of PROJECT_TYPES) {
          const tasksRef = collection(db, 'projects', projectType, 'tasks');
          const tasksSnapshot = await getDocs(tasksRef);

          tasksSnapshot.docs.forEach((docItem) => {
            const taskData = docItem.data();
            allTasks.push({
              id: docItem.id,
              projectType,
              ...taskData,
              createdAt: taskData.createdAt?.toDate(),
              updatedAt: taskData.updatedAt?.toDate(),
              itUpDate: taskData.itUpDate?.toDate() || null,
              releaseDate: taskData.releaseDate?.toDate() || null,
              dueDate: taskData.dueDate?.toDate() || null,
              completedAt: taskData.completedAt?.toDate() || null,
            } as Task & { projectType: ProjectType });
          });
        }

        return allTasks.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });
      }
      const tasksRef = collection(db, 'projects', selectedProjectType, 'tasks');
      const snapshot = await getDocs(tasksRef);
      return snapshot.docs.map((docItem) => {
        const taskData = docItem.data();
        return {
          id: docItem.id,
          projectType: selectedProjectType,
          ...taskData,
          createdAt: taskData.createdAt?.toDate(),
          updatedAt: taskData.updatedAt?.toDate(),
          itUpDate: taskData.itUpDate?.toDate() || null,
          releaseDate: taskData.releaseDate?.toDate() || null,
          dueDate: taskData.dueDate?.toDate() || null,
          completedAt: taskData.completedAt?.toDate() || null,
        } as Task & { projectType: ProjectType };
      });
    },
    enabled: !!user && !!db,
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
  }, [selectedTask?.id, selectedTaskId]); // selectedTaskのidとselectedTaskIdを依存配列に含める

  // 区分ラベルは全プロジェクト共通なので、そのまま使用
  const taskLabels = useMemo(() => allLabels || [], [allLabels]);

  // 「個別」ラベルのIDを取得
  const kobetsuLabelId = useMemo(() => {
    return allLabels?.find((label) => label.name === '個別')?.id || null;
  }, [allLabels]);

  // 選択されたタスクのセッション履歴を取得
  const { data: taskSessions } = useQuery({
    queryKey: ['taskSessions', selectedTaskId],
    queryFn: async () => {
      const projectType = (selectedTask as any)?.projectType;
      if (!projectType || !db || !selectedTaskId) return [];
      try {
        const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');
        const q = query(
          sessionsRef,
          where('taskId', '==', selectedTaskId),
          orderBy('startedAt', 'desc')
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
            const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');
            const q = query(sessionsRef, where('taskId', '==', selectedTaskId));
            const snapshot = await getDocs(q);
            const sessions = snapshot.docs.map((docItem) => {
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
            return sessions.sort((a, b) => {
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
    enabled: !!selectedTask && !!selectedTaskId,
  });

  // アクティブなセッションを取得（すべてのプロジェクトタイプから）
  useQuery({
    queryKey: ['activeSession', user?.id],
    queryFn: async () => {
      if (!user || !db) return null;
      const allSessions: any[] = [];

      // すべてのプロジェクトタイプからアクティブセッションを取得
      for (const projectType of PROJECT_TYPES) {
        const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');
        const q = query(
          sessionsRef,
          where('userId', '==', user.id),
          where('endedAt', '==', null),
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((docItem) => {
          allSessions.push({
            id: docItem.id,
            projectType,
            taskId: docItem.data().taskId,
            ...docItem.data(),
          });
        });
      }

      if (allSessions.length > 0) {
        const session = allSessions[0];
        setActiveSession({
          projectType: session.projectType,
          taskId: session.taskId,
          sessionId: session.id,
        });
        return session;
      } else {
        setActiveSession(null);
        return null;
      }
    },
    enabled: !!user && !!db,
    refetchInterval: 5000, // 5秒ごとに再取得して、リアルタイムで状態を更新
  });

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      if (!selectedTask || !db) throw new Error('Task not found');
      const projectType = (selectedTask as any)?.projectType;
      if (!projectType) throw new Error('Project type not found');
      const taskRef = doc(db, 'projects', projectType, 'tasks', selectedTask.id);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['tasks'] });
      // フォームデータはuseEffectで自動更新されるため、ここでは何もしない
    },
  });

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
    updateTask.mutate(taskFormData);
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

  const handleResetFilters = () => {
    setSelectedProjectType('all');
    setFilterStatus('all');
    setFilterAssignee('all');
    setFilterLabel('all');
    setFilterTimerActive('all');
    setFilterItUpDateMonth('');
    setFilterReleaseDateMonth('');
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

  const handleDeleteTask = async () => {
    if (!deleteTaskId || !deleteProjectType || !db) return;

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

    try {
      const taskRef = doc(db, 'projects', deleteProjectType, 'tasks', deleteTaskId);
      await deleteDoc(taskRef);

      // タスク一覧を更新
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['tasks'] });

      // 削除したタスクが選択されていた場合はサイドバーを閉じる
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

  // アサインの表示名を取得
  const getAssigneeNames = (assigneeIds: string[]) => {
    if (!allUsers || assigneeIds.length === 0) return '-';
    return (
      assigneeIds
        .map((id) => allUsers.find((u) => u.id === id)?.displayName)
        .filter(Boolean)
        .join(', ') || '-'
    );
  };

  // 区分の表示名を取得
  const getLabelName = (labelId: string) => {
    if (!allLabels || !labelId) return '-';
    const label = allLabels.find((l) => l.id === labelId);
    return label?.name || '-';
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
                  {flowStatusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {flowStatusLabels[status]}
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

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>タイトル</TableCell>
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
              {filteredTasks && filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {(() => {
                        if (tasks && tasks.length === 0) {
                          if (selectedProjectType === 'all') {
                            return 'タスクがありません';
                          }
                          return 'このプロジェクトにタスクがありません';
                        }
                        return 'フィルタ条件に一致するタスクがありません';
                      })()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks?.map((task) => {
                  const isActive = activeSession?.taskId === task.id;
                  return (
                    <TableRow
                      key={task.id}
                      onClick={() => handleTaskSelect(task.id)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: 'medium' }}>{task.title}</Typography>
                        {selectedProjectType === 'all' && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              color: 'text.secondary',
                              mt: 0.5,
                            }}
                          >
                            {(task as any).projectType || ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{getAssigneeNames(task.assigneeIds)}</TableCell>
                      <TableCell>
                        {task.itUpDate ? format(task.itUpDate, 'yyyy-MM-dd') : '-'}
                      </TableCell>
                      <TableCell>
                        {task.releaseDate ? format(task.releaseDate, 'yyyy-MM-dd') : '-'}
                      </TableCell>
                      <TableCell>{flowStatusLabels[task.flowStatus]}</TableCell>
                      <TableCell>{getLabelName(task.kubunLabelId)}</TableCell>
                      <TableCell>
                        {isActive && <Chip label="稼働中" color="success" size="small" />}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {task.kubunLabelId === kobetsuLabelId ? (
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            -
                          </Typography>
                        ) : isActive ? (
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
                              animation: stopTimer.isPending
                                ? 'none'
                                : 'pulse 2s ease-in-out infinite',
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
                              const { projectType } = (task as any);
                              handleStartTimer(projectType, task.id);
                            }}
                            disabled={
                              (!!activeSession && activeSession.taskId !== task.id) ||
                              startTimer.isPending
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
