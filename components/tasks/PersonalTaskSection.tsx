'use client';

import { Label } from '@/types';
import { AssigneeSection, UNASSIGNED_ID } from '@/lib/taskGrouping';
import { StatusBlock } from '@/components/tasks/StatusBlock';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box, Chip, Avatar } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import PersonOffIcon from '@mui/icons-material/PersonOff';

interface PersonalTaskSectionProps {
  section: AssigneeSection;
  onTaskSelect: (taskId: string) => void;
  allLabels?: Label[];
  currentUserId?: string | null;
  showProjectType?: boolean;
  unreadTaskIds?: Set<string>;
  oneWeekAgo: number;
  defaultExpanded?: boolean;
}

export function PersonalTaskSection({
  section,
  onTaskSelect,
  allLabels,
  currentUserId,
  showProjectType = false,
  unreadTaskIds,
  oneWeekAgo,
  defaultExpanded = true,
}: PersonalTaskSectionProps) {
  const isUnassigned = section.assigneeId === UNASSIGNED_ID;
  const isCurrentUser = section.assigneeId === currentUserId;

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      sx={{
        border: '1px solid',
        borderColor: isCurrentUser ? 'primary.200' : 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        '&:before': { display: 'none' },
        mb: 2,
        boxShadow: isCurrentUser ? '0 0 0 1px rgba(25, 118, 210, 0.1)' : 'none',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          bgcolor: isCurrentUser ? 'primary.50' : isUnassigned ? 'grey.100' : 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiAccordionSummary-content': {
            my: 1,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: isUnassigned ? 'grey.400' : isCurrentUser ? 'primary.main' : 'grey.500',
            }}
          >
            {isUnassigned ? <PersonOffIcon sx={{ fontSize: 18 }} /> : <PersonIcon sx={{ fontSize: 18 }} />}
          </Avatar>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {section.assigneeName}
            {isCurrentUser && (
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'primary.main' }}>
                (自分)
              </Typography>
            )}
          </Typography>
          <Chip
            label={`${section.totalCount}件`}
            size="small"
            color={isCurrentUser ? 'primary' : 'default'}
            sx={{
              height: 24,
              fontWeight: 'medium',
            }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {section.statusGroups.map((statusGroup) => (
            <StatusBlock
              key={statusGroup.status}
              statusGroup={statusGroup}
              onTaskSelect={onTaskSelect}
              allLabels={allLabels}
              currentUserId={currentUserId}
              showProjectType={showProjectType}
              unreadTaskIds={unreadTaskIds}
              oneWeekAgo={oneWeekAgo}
              defaultExpanded={true}
            />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
