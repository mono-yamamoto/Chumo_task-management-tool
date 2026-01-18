'use client';

import { Box, BoxProps } from '@mui/material';
import { Comment } from '@mui/icons-material';

interface UnreadBadgeProps extends Omit<BoxProps, 'component'> {
  size?: 'sm' | 'md';
}

const sizeStyles = {
  sm: {
    width: 16,
    height: 16,
    iconSize: 10,
  },
  md: {
    width: 20,
    height: 20,
    iconSize: 12,
  },
};

export function UnreadBadge({ size = 'sm', sx, ...props }: UnreadBadgeProps) {
  const styles = sizeStyles[size];

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: styles.width,
        height: styles.height,
        borderRadius: '50%',
        backgroundColor: '#3b82f6',
        color: 'white',
        flexShrink: 0,
        ...sx,
      }}
      title="未読コメントあり"
      {...props}
    >
      <Comment sx={{ fontSize: styles.iconSize }} />
    </Box>
  );
}
