'use client';

import { Box, BoxProps } from '@mui/material';
import { PROGRESS_STATUS_COLORS } from '@/constants/taskConstants';
import { ProgressStatus } from '@/types';

export interface ProgressStatusBadgeProps extends Omit<BoxProps, 'component'> {
  status: ProgressStatus;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: {
    fontSize: '0.7rem',
    padding: '3px 8px',
  },
  md: {
    fontSize: '0.75rem',
    padding: '4px 10px',
  },
  lg: {
    fontSize: '0.875rem',
    padding: '6px 12px',
  },
};

export function ProgressStatusBadge({ status, size = 'sm', sx, ...props }: ProgressStatusBadgeProps) {
  const backgroundColor = PROGRESS_STATUS_COLORS[status];

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        flexShrink: 0,
        fontWeight: 'bold',
        backgroundColor,
        color: '#ffffff',
        ...sizeStyles[size],
        ...sx,
      }}
      {...props}
    >
      {status}
    </Box>
  );
}
