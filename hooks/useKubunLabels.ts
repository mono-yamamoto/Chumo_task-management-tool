'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchKubunLabels } from '@/lib/api/labelRepository';

/**
 * 全プロジェクト共通の区分ラベルを取得するカスタムフック
 * 区分ラベルは projectId が null のラベルとして管理される
 */
export function useKubunLabels() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['kubunLabels'],
    queryFn: () => fetchKubunLabels(getToken),
  });
}
