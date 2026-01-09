'use client';

import { useCallback } from 'react';
import { QueryClient, QueryKey } from '@tanstack/react-query';
import { useTimer } from '@/hooks/useTimer';
import { queryKeys } from '@/lib/queryKeys';
import { ActiveSession, ProjectType } from '@/types';
import { useToast } from '@/hooks/useToast';

interface UseTimerActionsOptions {
  userId?: string;
  queryClient: QueryClient;
  setActiveSession: (_session: ActiveSession | null) => void;
  extraInvalidateKeys?: QueryKey[];
  extraRefetchKeys?: QueryKey[];
}

export function useTimerActions({
  userId,
  queryClient,
  setActiveSession,
  extraInvalidateKeys = [],
  extraRefetchKeys = [],
}: UseTimerActionsOptions) {
  const { startTimer, stopTimer } = useTimer();
  const toast = useToast();

  const invalidateKeys = useCallback(
    (keys: QueryKey[]) => {
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
    [queryClient]
  );

  const refetchKeys = useCallback(
    (keys: QueryKey[]) => {
      keys.forEach((key) => {
        queryClient.refetchQueries({ queryKey: key });
      });
    },
    [queryClient]
  );

  const startTimerWithOptimistic = useCallback(
    async (projectType: ProjectType, taskId: string) => {
      if (!userId) return;
      setActiveSession({ projectType, taskId, sessionId: 'pending' });
      try {
        const result = await startTimer.mutateAsync({
          projectType,
          taskId,
          userId,
        });
        if (result?.sessionId) {
          setActiveSession({ projectType, taskId, sessionId: result.sessionId });
        }
        const baseKeys = userId ? ([queryKeys.activeSession(userId)] as QueryKey[]) : [];
        invalidateKeys(baseKeys);
        invalidateKeys(extraInvalidateKeys);
        refetchKeys(baseKeys);
        refetchKeys(extraRefetchKeys);
      } catch (error: any) {
        console.error('Timer start error:', error);
        setActiveSession(null);
        if (error.message?.includes('稼働中')) {
          toast.warning('他のタイマーが稼働中です。停止してから開始してください。');
        } else {
          toast.error(`タイマーの開始に失敗しました: ${error.message || '不明なエラー'}`);
        }
      }
    },
    [
      userId,
      setActiveSession,
      startTimer,
      invalidateKeys,
      refetchKeys,
      extraInvalidateKeys,
      extraRefetchKeys,
      toast,
    ]
  );

  const stopActiveSession = useCallback(
    async (activeSession: ActiveSession | null) => {
      if (!activeSession || activeSession.sessionId === 'pending') return;
      try {
        await stopTimer.mutateAsync({
          projectType: activeSession.projectType,
          sessionId: activeSession.sessionId,
        });
        setActiveSession(null);
        const baseKeys = userId ? ([queryKeys.activeSession(userId)] as QueryKey[]) : [];
        invalidateKeys(baseKeys);
        invalidateKeys(extraInvalidateKeys);
        refetchKeys(baseKeys);
        refetchKeys(extraRefetchKeys);
      } catch (error: any) {
        console.error('Timer stop error:', error);
        toast.error(`タイマーの停止に失敗しました: ${error.message || '不明なエラー'}`);
      }
    },
    [
      userId,
      setActiveSession,
      stopTimer,
      invalidateKeys,
      refetchKeys,
      extraInvalidateKeys,
      extraRefetchKeys,
      toast,
    ]
  );

  return {
    startTimer,
    stopTimer,
    startTimerWithOptimistic,
    stopActiveSession,
  };
}
