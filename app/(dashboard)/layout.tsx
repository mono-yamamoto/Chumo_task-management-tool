'use client';

import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useTimerTitle } from '@/hooks/useTimerTitle';
import { Button } from '@/components/ui/button';
import { AppBar, Toolbar, Typography, Box, Link as MUILink } from '@mui/material';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  useTimerTitle(); // タイマータイトル更新を有効化

  return (
    <AuthGuard>
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar
            sx={{
              maxWidth: '1280px',
              mx: 'auto',
              width: '100%',
              px: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexGrow: 1,
              }}
            >
              <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                  ちゅも
                </Typography>
              </Link>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                  <MUILink
                    component="span"
                    sx={{ color: 'text.primary', '&:hover': { color: 'text.secondary' } }}
                  >
                    ダッシュボード
                  </MUILink>
                </Link>
                <Link href="/tasks" style={{ textDecoration: 'none' }}>
                  <MUILink
                    component="span"
                    sx={{ color: 'text.primary', '&:hover': { color: 'text.secondary' } }}
                  >
                    タスク
                  </MUILink>
                </Link>
                <Link href="/reports" style={{ textDecoration: 'none' }}>
                  <MUILink
                    component="span"
                    sx={{ color: 'text.primary', '&:hover': { color: 'text.secondary' } }}
                  >
                    レポート
                  </MUILink>
                </Link>
                <Link href="/contact" style={{ textDecoration: 'none' }}>
                  <MUILink
                    component="span"
                    sx={{ color: 'text.primary', '&:hover': { color: 'text.secondary' } }}
                  >
                    お問い合わせ
                  </MUILink>
                </Link>
                <Link href="/settings" style={{ textDecoration: 'none' }}>
                  <MUILink
                    component="span"
                    sx={{ color: 'text.primary', '&:hover': { color: 'text.secondary' } }}
                  >
                    設定
                  </MUILink>
                </Link>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {user?.displayName}
              </Typography>
              <Button onClick={logout} variant="outline" size="sm">
                ログアウト
              </Button>
            </Box>
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          sx={{
            maxWidth: '1280px',
            mx: 'auto',
            px: 2,
            py: 4,
          }}
        >
          {children}
        </Box>
      </Box>
    </AuthGuard>
  );
}
