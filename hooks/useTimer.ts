'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getStartTimerUrl, getStopTimerUrl } from '@/utils/functions';
import { queryKeys } from '@/lib/queryKeys';

export function useTimer() {
  const queryClient = useQueryClient();

  const startTimer = useMutation({
    mutationFn: async ({
      projectType,
      taskId,
      userId,
    }: {
      projectType: string;
      taskId: string;
      userId: string;
    }) => {
      const timerUrl = getStartTimerUrl();
      const response = await fetch(`${timerUrl}/projects/${projectType}/tasks/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        let errorMessage = 'タイマーの開始に失敗しました';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          // JSONパースに失敗した場合、ステータステキストを使用
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
    },
  });

  const stopTimer = useMutation({
    mutationFn: async ({ projectType, sessionId }: { projectType: string; sessionId: string }) => {
      const timerUrl = getStopTimerUrl();
      const response = await fetch(`${timerUrl}/projects/${projectType}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        let errorMessage = 'タイマーの停止に失敗しました';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          // JSONパースに失敗した場合、ステータステキストを使用
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
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
