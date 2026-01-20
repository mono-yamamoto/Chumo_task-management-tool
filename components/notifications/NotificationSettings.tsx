'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Notifications, NotificationsOff, NotificationsActive } from '@mui/icons-material';
import { useFcmToken } from '@/hooks/useFcmToken';

export function NotificationSettings() {
  const {
    permissionStatus,
    isLoading,
    error,
    isEnabled,
    enableNotifications,
    disableNotifications,
  } = useFcmToken();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggle = async () => {
    setIsProcessing(true);
    try {
      if (isEnabled) {
        await disableNotifications();
      } else {
        await enableNotifications();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isVapidConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  // VAPID未設定の場合
  if (!isVapidConfigured) {
    return (
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <NotificationsOff color="disabled" />
          <Typography variant="subtitle1" fontWeight="medium">
            プッシュ通知
          </Typography>
        </Box>
        <Alert severity="info">
          プッシュ通知を有効にするには、Firebase Consoleで VAPID Key を設定してください。
        </Alert>
      </Paper>
    );
  }

  // 通知がサポートされていない場合
  if (permissionStatus === 'unsupported') {
    return (
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <NotificationsOff color="disabled" />
          <Typography variant="subtitle1" fontWeight="medium">
            プッシュ通知
          </Typography>
        </Box>
        <Alert severity="warning">
          このブラウザはプッシュ通知に対応していません。
        </Alert>
      </Paper>
    );
  }

  // 通知が拒否されている場合
  if (permissionStatus === 'denied') {
    return (
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <NotificationsOff color="error" />
          <Typography variant="subtitle1" fontWeight="medium">
            プッシュ通知
          </Typography>
        </Box>
        <Alert severity="error">
          通知がブロックされています。ブラウザの設定から通知を許可してください。
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isEnabled ? (
            <NotificationsActive color="primary" />
          ) : (
            <Notifications color="action" />
          )}
          <Box>
            <Typography variant="subtitle1" fontWeight="medium">
              プッシュ通知
            </Typography>
            <Typography variant="body2" color="text.secondary">
              メンションされた時にブラウザ通知を受け取る
            </Typography>
          </Box>
        </Box>

        {isLoading || isProcessing ? (
          <CircularProgress size={24} />
        ) : (
          <Switch
            checked={isEnabled}
            onChange={handleToggle}
            inputProps={{ 'aria-label': 'プッシュ通知を有効にする' }}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error.message}
        </Alert>
      )}

      {isEnabled && (
        <Alert severity="success" sx={{ mt: 2 }}>
          プッシュ通知が有効です。メンションされると通知が届きます。
        </Alert>
      )}
    </Paper>
  );
}
