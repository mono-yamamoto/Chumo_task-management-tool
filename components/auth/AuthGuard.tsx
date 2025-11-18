'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 次のレンダリングサイクルでsetStateを実行
    setTimeout(() => {
      setMounted(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      // 次のレンダリングサイクルでsetStateを実行
      setTimeout(() => {
        router.push('/login');
      }, 0);
    }
  }, [user, loading, router]);

  // サーバーサイドレンダリング時は何も表示しない（Hydrationエラーを防ぐ）
  if (!mounted) {
    return null;
  }

  // クライアントサイドでローディング中はローディング状態を表示
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
