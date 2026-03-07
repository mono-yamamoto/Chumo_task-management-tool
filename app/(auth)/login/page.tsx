'use client';

import { SignIn } from '@clerk/nextjs';
import { Box, Typography } from '@mui/material';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function LoginContent() {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'center',
        }}
      >
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
          タスク管理ツール
        </Typography>
        <SignIn
          routing="hash"
          appearance={{
            elements: {
              rootBox: { width: '100%', maxWidth: 400 },
            },
          }}
        />
      </Box>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography>読み込み中...</Typography>
        </Box>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
