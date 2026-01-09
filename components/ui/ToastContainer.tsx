'use client';

import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useToastStore } from '@/hooks/useToast';
import { DEFAULT_TOAST_DURATION_MS } from '@/constants/timer';

/**
 * トースト通知を表示するコンテナコンポーネント
 * アプリケーションルート近くに配置する
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <>
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration || DEFAULT_TOAST_DURATION_MS}
          onClose={() => removeToast(toast.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            // 複数のトーストを縦に並べる
            top: `${80 + index * 70}px !important`,
          }}
        >
          <Alert
            onClose={() => removeToast(toast.id)}
            severity={toast.type}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}
