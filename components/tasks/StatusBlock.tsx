'use client';

import { useState } from 'react';
import { Task, Label } from '@/types';
import { FLOW_STATUS_LABELS } from '@/constants/taskConstants';
import { StatusGroup } from '@/lib/taskGrouping';
import { TaskCard } from '@/components/tasks/TaskCard';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ProjectType } from '@/constants/projectTypes';

interface StatusBlockProps {
  statusGroup: StatusGroup;
  onTaskSelect: (taskId: string) => void;
  allLabels?: Label[];
  currentUserId?: string | null;
  showProjectType?: boolean;
  unreadTaskIds?: Set<string>;
  oneWeekAgo: number;
  defaultExpanded?: boolean;
}

export function StatusBlock({
  statusGroup,
  onTaskSelect,
  allLabels,
  currentUserId,
  showProjectType = false,
  unreadTaskIds,
  oneWeekAgo,
  defaultExpanded = true,
}: StatusBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { status, tasks } = statusGroup;

  // 未アサインかつ作成から1週間以内のタスクかどうかを判定
  const isNewTask = (task: Task) => {
    if (task.assigneeIds.length > 0) return false;
    if (!task.createdAt) return false;
    return task.createdAt.getTime() >= oneWeekAgo;
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: 36,
          py: 0,
          px: 1,
          bgcolor: 'grey.50',
          borderRadius: 1,
          '& .MuiAccordionSummary-content': {
            my: 0.5,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {FLOW_STATUS_LABELS[status]}
          </Typography>
          <Chip
            label={tasks.length}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.75rem',
              bgcolor: 'grey.200',
            }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 1.5, pb: 1, px: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task as Task & { projectType: ProjectType }}
              onTaskSelect={onTaskSelect}
              allLabels={allLabels}
              currentUserId={currentUserId}
              showProjectType={showProjectType}
              hasUnreadComment={unreadTaskIds?.has(task.id)}
              isNewTask={isNewTask(task)}
            />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
