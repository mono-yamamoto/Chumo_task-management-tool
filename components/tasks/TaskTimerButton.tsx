'use client';

import { Button, CircularProgress } from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
import { Button as CustomButton } from '@/components/ui/button';

interface TaskTimerButtonProps {
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
  isStarting?: boolean;
  isStopping?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'contained' | 'outlined' | 'text';
  kobetsuLabelId?: string | null;
  taskKubunLabelId?: string;
}

export function TaskTimerButton({
  isActive,
  onStart,
  onStop,
  isStarting = false,
  isStopping = false,
  disabled = false,
  fullWidth = false,
  size = 'medium',
  variant = 'outlined',
  kobetsuLabelId,
  taskKubunLabelId,
}: TaskTimerButtonProps) {
  // 「個別」ラベルの場合はタイマーを表示しない
  if (kobetsuLabelId && taskKubunLabelId === kobetsuLabelId) {
    return null;
  }

  if (isActive) {
    return (
      <Button
        fullWidth={fullWidth}
        size={size}
        variant="contained"
        color="error"
        onClick={onStop}
        disabled={disabled || isStopping}
        sx={{
          animation: isStopping
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
        {isStopping ? (
          <>
            <CircularProgress size={16} sx={{ color: 'inherit', mr: 1 }} />
            停止中...
          </>
        ) : (
          <>
            <Stop fontSize="small" sx={{ mr: 1 }} />
            タイマー停止
          </>
        )}
      </Button>
    );
  }

  return (
    <CustomButton
      fullWidth={fullWidth}
      variant={variant}
      onClick={onStart}
      disabled={disabled || isStarting}
    >
      {isStarting ? (
        <>
          <CircularProgress size={16} sx={{ color: 'inherit', mr: 1 }} />
          開始中...
        </>
      ) : (
        <>
          <PlayArrow fontSize="small" sx={{ mr: 1 }} />
          タイマー開始
        </>
      )}
    </CustomButton>
  );
}

