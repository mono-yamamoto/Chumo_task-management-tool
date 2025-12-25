'use client';

import { Box, BoxProps } from '@mui/material';

export interface BadgeProps extends Omit<BoxProps, 'component'> {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: {
    backgroundColor: '#6b7280',
    color: 'white',
  },
  success: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  warning: {
    backgroundColor: '#f59e0b',
    color: 'white',
  },
  error: {
    backgroundColor: '#ef4444',
    color: 'white',
  },
  info: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
};

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

export function Badge({ children, variant = 'default', size = 'sm', sx, ...props }: BadgeProps) {
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
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
