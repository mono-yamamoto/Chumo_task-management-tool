'use client';

import { Button, CircularProgress } from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
import { Button as CustomButton } from '@/components/ui/button';

interface TaskTimerButtonProps {
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
  isStopping?: boolean;
  startDisabled?: boolean;
  stopDisabled?: boolean;
  fullWidth?: boolean;
  stopButtonSize?: 'small' | 'medium' | 'large';
  startButtonSize?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  displayMode?: 'full' | 'icon';
  // 未使用パラメータ（将来使用予定）
  _kobetsuLabelId?: string | null;
  _taskKubunLabelId?: string;
}

export function TaskTimerButton({
  isActive,
  onStart,
  onStop,
  isStopping = false,
  startDisabled = false,
  stopDisabled = false,
  fullWidth = false,
  stopButtonSize = 'medium',
  startButtonSize = 'default',
  variant = 'outline',
  displayMode = 'full',
  _kobetsuLabelId,
  _taskKubunLabelId,
}: TaskTimerButtonProps) {
  const isIconMode = displayMode === 'icon';

  if (isActive) {
    return (
      <Button
        fullWidth={fullWidth}
        size={stopButtonSize}
        variant="contained"
        color="error"
        onClick={onStop}
        disabled={stopDisabled || isStopping}
        sx={{
          animation: isStopping ? 'none' : 'pulse 2s ease-in-out infinite',
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
          isIconMode ? (
            <CircularProgress size={16} sx={{ color: 'inherit' }} />
          ) : (
            <>
              <CircularProgress size={16} sx={{ color: 'inherit', mr: 1 }} />
              停止中...
            </>
          )
        ) : (
          <>
            <Stop fontSize="small" sx={{ mr: isIconMode ? 0 : 1 }} />
            {!isIconMode && 'タイマー停止'}
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
      disabled={startDisabled}
      size={startButtonSize}
    >
      <PlayArrow fontSize="small" sx={{ mr: isIconMode ? 0 : 1 }} />
      {!isIconMode && 'タイマー開始'}
    </CustomButton>
  );
}
