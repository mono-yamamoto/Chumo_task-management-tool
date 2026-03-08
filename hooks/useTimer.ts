'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/http/apiClient';
import { queryKeys } from '@/lib/queryKeys';

export function useTimer() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const startTimer = useMutation({
    mutationFn: async ({
      projectType,
      taskId,
    }: {
      projectType: string;
      taskId: string;
      userId: string;
    }) => {
      return apiClient<{ success: boolean; sessionId: string }>('/api/timer/start', {
        method: 'POST',
        body: { projectType, taskId },
        getToken,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
    },
  });

  const stopTimer = useMutation({
    mutationFn: async ({ projectType, sessionId }: { projectType: string; sessionId: string }) => {
      return apiClient<{ success: boolean; durationMin: number; durationSec: number }>(
        '/api/timer/stop',
        {
          method: 'POST',
          body: { projectType, sessionId },
          getToken,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
    },
  });

  return {
    startTimer,
    stopTimer,
  };
}
