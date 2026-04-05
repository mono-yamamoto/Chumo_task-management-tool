import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuth } from './useAuth';

interface SessionUpdateInput {
  startedAt?: string;
  endedAt?: string;
}

/**
 * セッション更新 mutation
 * PUT /api/sessions/:id
 */
export function useUpdateSession() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: SessionUpdateInput }) =>
      apiClient<{ success: boolean }>(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        body: data,
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
