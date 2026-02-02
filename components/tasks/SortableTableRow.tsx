'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableRow, TableCell, Box, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Task, Label, User } from '@/types';
import { FLOW_STATUS_LABELS } from '@/constants/taskConstants';
import { Badge } from '@/components/ui/badge';
import { UnreadBadge } from '@/components/ui/UnreadBadge';
import { ProgressStatusBadge } from '@/components/ui/ProgressStatusBadge';
import { TaskTimerButton } from '@/components/tasks/TaskTimerButton';
import { format } from 'date-fns';
import { ProjectType } from '@/constants/projectTypes';

interface SortableTableRowProps {
  task: Task & { projectType: ProjectType };
  onTaskSelect: (taskId: string) => void;
  shouldShowProjectType: boolean;
  allUsers?: User[];
  allLabels?: Label[];
  activeSession: { projectType: ProjectType; taskId: string; sessionId: string } | null;
  onStartTimer: (projectType: ProjectType, taskId: string) => void;
  onStopTimer: () => void;
  isStoppingTimer: boolean;
  currentUserId?: string | null;
  unreadTaskIds?: Set<string>;
  isNewTask: boolean;
  isDragDisabled?: boolean;
}

export function SortableTableRow({
  task,
  onTaskSelect,
  shouldShowProjectType,
  allUsers,
  allLabels,
  activeSession,
  onStartTimer,
  onStopTimer,
  isStoppingTimer,
  currentUserId,
  unreadTaskIds,
  isNewTask,
  isDragDisabled = false,
}: SortableTableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'rgba(0, 0, 0, 0.04)' : undefined,
  };

  const isActive = activeSession?.taskId === task.id;
  const isStartDisabled = !!activeSession && activeSession.taskId !== task.id;

  const getAssigneeNames = (assigneeIds: string[]) => {
    if (!allUsers || assigneeIds.length === 0) return '-';
    return (
      assigneeIds
        .map((id) => allUsers.find((u) => u.id === id)?.displayName)
        .filter(Boolean)
        .join(', ') || '-'
    );
  };

  const getLabelName = (labelId: string) => {
    if (!allLabels || !labelId) return '-';
    const label = allLabels.find((l) => l.id === labelId);
    return label?.name || '-';
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      onClick={() => onTaskSelect(task.id)}
      sx={{
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* ドラッグハンドル */}
      <TableCell
        sx={{ width: 40, p: 0.5, cursor: isDragDisabled ? 'default' : 'grab' }}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDragDisabled ? 'text.disabled' : 'text.secondary',
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      </TableCell>
      <TableCell sx={{ maxWidth: '400px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isNewTask && <Badge variant="error">New</Badge>}
          {currentUserId &&
            task.assigneeIds.includes(currentUserId) &&
            unreadTaskIds?.has(task.id) && <UnreadBadge size="sm" />}
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
      <TableCell>
        {task.progressStatus ? <ProgressStatusBadge status={task.progressStatus} /> : '-'}
      </TableCell>
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
}
