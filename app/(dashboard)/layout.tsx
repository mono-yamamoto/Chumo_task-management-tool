'use client';

import React from 'react';
import { ThemeBackground } from '@/components/ThemeBackground';
import { ThemeSelector } from '@/components/ThemeSelector';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useTimerTitle } from '@/hooks/useTimerTitle';
import { useActiveSessionValidator } from '@/hooks/useActiveSessionValidator';
import { useTaskStore } from '@/stores/taskStore';
import { Button } from '@/components/ui/button';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { AppBar, Toolbar, Typography, Box, Link as MUILink } from '@mui/material';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { activeSession, setActiveSession } = useTaskStore();

  useTimerTitle(); // タイマータイトル更新を有効化

  // localStorage内のactiveSessionをFirestoreと照合し、不一致の場合はクリア
  useActiveSessionValidator(user?.id, activeSession, setActiveSession);

  return (
    <AuthGuard>
      <ToastContainer />
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', position: 'relative' }}>
        {/* テーマ背景 */}
        <ThemeBackground />
        <AppBar
          position="static"
          color="default"
          elevation={1}
          sx={{ position: 'relative', zIndex: 1 }}
        >
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
              <ThemeSelector />
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
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </Box>
      </Box>
    </AuthGuard>
  );
}
