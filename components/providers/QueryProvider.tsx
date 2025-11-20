'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // QueryClientをuseStateで作成することで、クライアント側でのみインスタンス化される
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0, // 常に最新データを取得するため、staleTimeを0に設定
            refetchOnWindowFocus: false,
            refetchOnMount: true, // マウント時に再取得
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
