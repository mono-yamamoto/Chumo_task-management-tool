import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { TaskPin } from '../types';

const EMPTY_PINS: TaskPin[] = [];

/**
 * ログインユーザーのピン一覧を取得
 * GET /api/task-pins
 */
export function useTaskPins() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.taskPins(),
    queryFn: () =>
      apiClient<{ pins: TaskPin[] }>('/api/task-pins', { getToken }).then((res) => res.pins),
    enabled: isSignedIn,
  });
}

/**
 * ピン留め済みタスクIDのSetを返す（O(1)ルックアップ用）
 */
export function usePinnedTaskIds(): Set<string> {
  const { data: pins = EMPTY_PINS } = useTaskPins();
  return useMemo(() => new Set(pins.map((p) => p.taskId)), [pins]);
}

/**
 * ピン留め/解除のトグル mutation（楽観的更新付き）
 */
export function useTogglePin() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, isPinned }: { taskId: string; isPinned: boolean }) => {
      if (isPinned) {
        return apiClient<{ success: boolean }>(`/api/task-pins/${taskId}`, {
          method: 'DELETE',
          getToken,
        });
      }
      return apiClient<{ pin: TaskPin }>('/api/task-pins', {
        method: 'POST',
        body: { taskId },
        getToken,
      });
    },
    onMutate: async ({ taskId, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.taskPins() });
      const previousPins = queryClient.getQueryData<TaskPin[]>(queryKeys.taskPins());

      queryClient.setQueryData<TaskPin[]>(queryKeys.taskPins(), (old = []) => {
        if (isPinned) {
          return old.filter((p) => p.taskId !== taskId);
        }
        const maxOrder = old.length > 0 ? Math.max(...old.map((p) => p.order)) : -1;
        return [
          ...old,
          { id: `temp-${taskId}`, taskId, order: maxOrder + 1, pinnedAt: new Date().toISOString() },
        ];
      });

      return { previousPins };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousPins) {
        queryClient.setQueryData(queryKeys.taskPins(), context.previousPins);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskPins() });
    },
  });
}
