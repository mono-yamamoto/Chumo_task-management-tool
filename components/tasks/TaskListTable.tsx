'use client';

import { Task, Label, User } from '@/types';
import { FLOW_STATUS_LABELS } from '@/constants/taskConstants';
import { Button as CustomButton } from '@/components/ui/button';
import {
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
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
  isStartingTimer: boolean;
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
  isStartingTimer,
  isStoppingTimer,
  kobetsuLabelId,
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
              const defaultRowSx = {
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              };
              const customRowSx = rowSx ? rowSx(task, isActive) : {};
              const finalRowSx = { ...defaultRowSx, ...customRowSx };

              return (
                <TableRow key={task.id} onClick={() => onTaskSelect(task.id)} sx={finalRowSx}>
                  <TableCell sx={{ maxWidth: '400px' }}>
                    <Typography
                      sx={{
                        fontWeight: 'medium',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.title}
                    </Typography>
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
                  <TableCell>{getAssigneeNames(task.assigneeIds)}</TableCell>
                  <TableCell>
                    {task.itUpDate ? format(task.itUpDate, 'yyyy-MM-dd') : '-'}
                  </TableCell>
                  <TableCell>{FLOW_STATUS_LABELS[task.flowStatus]}</TableCell>
                  <TableCell>{getLabelName(task.kubunLabelId)}</TableCell>
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
                          onStopTimer();
                        }}
                        disabled={isStoppingTimer}
                        sx={{
                          animation: isStoppingTimer
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
                        {isStoppingTimer ? (
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
                          onStartTimer(task.projectType, task.id);
                        }}
                        disabled={
                          (!!activeSession && activeSession.taskId !== task.id) ||
                          isStartingTimer
                        }
                      >
                        {isStartingTimer ? (
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
  );
}

