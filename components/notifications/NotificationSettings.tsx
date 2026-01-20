'use client';

import { useState } from 'react';
import { Box, Typography, Button, Alert, CircularProgress, Paper } from '@mui/material';
import { Notifications, NotificationsOff } from '@mui/icons-material';
import { useFcmToken } from '@/hooks/useFcmToken';

export function NotificationSettings() {
  const { permissionStatus, isLoading, error, enableNotifications } = useFcmToken();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleEnable = async () => {
    setIsProcessing(true);
    try {
      await enableNotifications();
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Notifications color="action" />
        <Box>
          <Typography variant="subtitle1" fontWeight="medium">
            プッシュ通知
          </Typography>
          <Typography variant="body2" color="text.secondary">
            メンションされた時にブラウザ通知を受け取る
          </Typography>
        </Box>
      </Box>

      <Button
        variant="contained"
        onClick={handleEnable}
        disabled={isLoading || isProcessing}
        startIcon={isLoading || isProcessing ? <CircularProgress size={16} /> : <Notifications />}
        fullWidth
      >
        通知をオンにする
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error.message}
        </Alert>
      )}
    </Paper>
  );
}
