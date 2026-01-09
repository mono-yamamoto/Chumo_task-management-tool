'use client';

import { useMemo, useState } from 'react';
import { Task, Label, User } from '@/types';
import { FLOW_STATUS_LABELS } from '@/constants/taskConstants';
import { Badge } from '@/components/ui/badge';
import { TaskTimerButton } from '@/components/tasks/TaskTimerButton';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
} from '@mui/material';
import { format } from 'date-fns';
import { ProjectType } from '@/constants/projectTypes';

interface TaskListTableProps {
  tasks: (Task & { projectType: ProjectType })[];
  onTaskSelect: (taskId: string) => void;
  selectedProjectType?: ProjectType | 'all';
  allUsers?: User[];
  allLabels?: Label[];
  activeSession: { projectType: string; taskId: string; sessionId: string } | null;
  onStartTimer: (projectType: string, taskId: string) => void;
  onStopTimer: () => void;
  isStoppingTimer: boolean;
  kobetsuLabelId: string | null;
  emptyMessage?: string;
  rowSx?: (task: Task & { projectType: ProjectType }, isActive: boolean) => any;
}

export function TaskListTable({
  tasks,
  onTaskSelect,
  selectedProjectType,
  allUsers,
  allLabels,
  activeSession,
  onStartTimer,
  onStopTimer,
  isStoppingTimer,
  emptyMessage = 'タスクがありません',
  rowSx,
}: TaskListTableProps) {
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

  // コンポーネントマウント時の時刻を保持（1週間判定用）
  // useStateの初期化関数内でDate.now()を使用（レンダリング中ではないため問題なし）
  const [mountTime] = useState(() => Date.now());

  // 現在時刻から1週間前の時刻を計算
  const oneWeekAgo = useMemo(() => {
    return mountTime - 7 * 24 * 60 * 60 * 1000;
  }, [mountTime]);

  // 未アサインかつ作成から1週間以内のタスクかどうかを判定
  const isNewTask = (task: Task & { projectType: ProjectType }) => {
    if (task.assigneeIds.length > 0) return false;
    if (!task.createdAt) return false;
    return task.createdAt.getTime() >= oneWeekAgo;
  };

  // プロジェクトタイプを表示するかどうか
  const shouldShowProjectType = selectedProjectType === 'all' || selectedProjectType === undefined;

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell>タイトル</TableCell>
            <TableCell>アサイン</TableCell>
            <TableCell>ITアップ</TableCell>
            <TableCell>ステータス</TableCell>
            <TableCell>区分</TableCell>
            <TableCell>タイマー</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks && tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            tasks?.map((task) => {
              const isActive = activeSession?.taskId === task.id;
              const isStartDisabled = !!activeSession && activeSession.taskId !== task.id;
              const defaultRowSx = {
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              };
              const customRowSx = rowSx ? rowSx(task, isActive) : {};
              const finalRowSx = { ...defaultRowSx, ...customRowSx };

              return (
                <TableRow key={task.id} onClick={() => onTaskSelect(task.id)} sx={finalRowSx}>
                  <TableCell sx={{ maxWidth: '400px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isNewTask(task) && <Badge variant="error">New</Badge>}
                      <Typography
                        sx={{
                          fontWeight: 'medium',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {task.title}
                      </Typography>
                    </Box>
                    {shouldShowProjectType && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: 'text.secondary',
                          mt: 0.5,
                        }}
                      >
                        {task.projectType || ''}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getAssigneeNames(task.assigneeIds)}
                  </TableCell>
                  <TableCell>{task.itUpDate ? format(task.itUpDate, 'yyyy-MM-dd') : '-'}</TableCell>
                  <TableCell>{FLOW_STATUS_LABELS[task.flowStatus]}</TableCell>
                  <TableCell>{getLabelName(task.kubunLabelId)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TaskTimerButton
                      isActive={isActive}
                      onStart={() => onStartTimer(task.projectType, task.id)}
                      onStop={onStopTimer}
                      isStopping={isStoppingTimer}
                      startDisabled={isStartDisabled}
                      stopButtonSize="small"
                      startButtonSize="sm"
                      displayMode="icon"
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
