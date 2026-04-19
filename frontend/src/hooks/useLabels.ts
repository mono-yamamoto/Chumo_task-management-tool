import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { Label } from '../types';

interface LabelsResponse {
  labels: Label[];
}

/**
 * 区分ラベル一覧を取得
 * GET /api/labels
 */
export function useLabels() {
  const { getToken, isSignedIn } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.labels(),
    queryFn: () => apiClient<LabelsResponse>('/api/labels', { getToken }).then((res) => res.labels),
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 10, // 10分（ラベルは変更頻度が低い）
  });

  const labelMap = useMemo(() => {
    const map = new Map<string, Label>();
    if (query.data) {
      for (const label of query.data) {
        map.set(label.id, label);
      }
    }
    return map;
  }, [query.data]);

  const getLabelById = (labelId: string): Label | undefined => labelMap.get(labelId);

  const getLabelName = (labelId: string): string => labelMap.get(labelId)?.name ?? labelId;

  return { ...query, labelMap, getLabelById, getLabelName };
}
