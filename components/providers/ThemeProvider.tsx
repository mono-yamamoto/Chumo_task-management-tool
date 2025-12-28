'use client';

import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { CssBaseline } from '@mui/material';
import { ReactNode, useMemo } from 'react';
import { useServerInsertedHTML } from 'next/navigation';

// Emotionキャッシュを作成（SSRとクライアント側で同じキーを使用）
const createEmotionCache = () => {
  const cache = createCache({ key: 'mui', prepend: true });
  cache.compat = true;
  return cache;
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
  const emotionCache = useMemo(() => createEmotionCache(), []);

  useServerInsertedHTML(() => {
    const inserted = emotionCache.inserted;
    const names = Object.keys(inserted).filter((name) => inserted[name] !== true);
    if (names.length === 0) {
      return null;
    }

    let styles = '';
    names.forEach((name) => {
      styles += inserted[name];
    });

    return (
      <style
        data-emotion={`${emotionCache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={emotionCache}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </CacheProvider>
  );
}
