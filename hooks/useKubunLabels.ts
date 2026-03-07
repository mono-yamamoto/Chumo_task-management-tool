'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchKubunLabels } from '@/lib/firestore/repositories/labelRepository';

/**
 * 全プロジェクト共通の区分ラベルを取得するカスタムフック
 * 区分ラベルは projectId が null のラベルとして管理される
 */
export function useKubunLabels() {
  return useQuery({
    queryKey: ['kubunLabels'],
    queryFn: fetchKubunLabels,
  });
}
