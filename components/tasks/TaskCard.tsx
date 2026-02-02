'use client';

import { Task, Label } from '@/types';
import { Badge } from '@/components/ui/badge';
import { UnreadBadge } from '@/components/ui/UnreadBadge';
import { ProgressStatusBadge } from '@/components/ui/ProgressStatusBadge';
import { Paper, Typography, Box, Chip } from '@mui/material';
import { ProjectType } from '@/constants/projectTypes';

interface TaskCardProps {
  task: Task & { projectType: ProjectType };
  onTaskSelect: (taskId: string) => void;
  allLabels?: Label[];
  currentUserId?: string | null;
  showProjectType?: boolean;
  showProgressStatus?: boolean;
  hasUnreadComment?: boolean;
  isNewTask?: boolean;
}

export function TaskCard({
  task,
  onTaskSelect,
  allLabels,
  currentUserId,
  showProjectType = false,
  showProgressStatus = false,
  hasUnreadComment = false,
  isNewTask = false,
}: TaskCardProps) {
  // 区分ラベルを取得
  const getLabel = (labelId: string): Label | null => {
    if (!allLabels || !labelId) return null;
    return allLabels.find((l) => l.id === labelId) || null;
  };

  const label = getLabel(task.kubunLabelId);

  return (
    <Paper
      component="button"
      type="button"
      sx={{
        p: 1.5,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease-in-out',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: 'grey.400',
        },
        '&:focus': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
        minWidth: 180,
        maxWidth: 280,
      }}
      onClick={() => onTaskSelect(task.id)}
    >
      {/* タイトル行 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0.5,
          mb: label || showProjectType ? 1 : 0,
        }}
      >
        {isNewTask && <Badge variant="error">New</Badge>}
        {currentUserId && task.assigneeIds.includes(currentUserId) && hasUnreadComment && (
          <UnreadBadge size="sm" />
        )}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'medium',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
            flex: 1,
          }}
        >
          {task.title}
        </Typography>
      </Box>

      {/* メタ情報行（区分ラベル、進捗ステータス、またはプロジェクトタイプがある場合のみ表示） */}
      {(label ||
        (showProgressStatus && task.progressStatus) ||
        (showProjectType && task.projectType)) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          {/* 区分ラベル（バッジスタイル） */}
          {label && (
            <Chip
              label={label.name}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 'medium',
                bgcolor: `${label.color}20`,
                color: label.color,
                border: '1px solid',
                borderColor: `${label.color}40`,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          )}

          {/* 進捗ステータス */}
          {showProgressStatus && task.progressStatus && (
            <ProgressStatusBadge status={task.progressStatus} />
          )}

          {/* プロジェクトタイプ */}
          {showProjectType && task.projectType && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontSize: '0.65rem',
              }}
            >
              {task.projectType}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}
