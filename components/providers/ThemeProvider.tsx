'use client';

import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { ReactNode, useMemo } from 'react';

// Emotionキャッシュを作成（SSRとクライアント側で同じキーを使用）
const createEmotionCache = () => {
  return createCache({ key: 'mui', prepend: true });
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // クライアント側でのみキャッシュを作成（SSR時はundefined）
  const emotionCache = useMemo(() => {
    if (typeof window !== 'undefined') {
      return createEmotionCache();
    }
    return null;
  }, []);

  // クライアント側ではCacheProviderでラップ、サーバー側では直接MUIThemeProviderを使用
  if (emotionCache) {
    return (
      <CacheProvider value={emotionCache}>
        <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>
      </CacheProvider>
    );
  }

  return <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>;
}
