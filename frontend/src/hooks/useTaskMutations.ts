import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { Task } from '../types';

type TaskCreateInput = Omit<Task, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'completedAt'>;
type TaskUpdateInput = Partial<
  Omit<Task, 'id' | 'projectType' | 'createdBy' | 'createdAt' | 'updatedAt'>
>;

/**
 * タスク作成 mutation
 * POST /api/tasks
 */
export function useCreateTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TaskCreateInput) =>
      apiClient<{ id: string }>('/api/tasks', {
        method: 'POST',
        body: data,
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
    },
  });
}

/**
 * タスク更新 mutation
 * PUT /api/tasks/:id
 *
 * onMutate でタスク詳細キャッシュを楽観的に更新する。
 * これによりポップオーバー閉時にドラフトが古い値へ巻き戻るチラつきを防ぐ。
 */
export function useUpdateTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: TaskUpdateInput }) =>
      apiClient<{ success: boolean }>(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: data,
        getToken,
      }),
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.task(taskId) });
      const previous = queryClient.getQueryData<Task>(queryKeys.task(taskId));
      if (previous) {
        queryClient.setQueryData<Task>(queryKeys.task(taskId), { ...previous, ...data });
      }
      return { previous };
    },
    onError: (_error, { taskId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.task(taskId), context.previous);
      }
    },
    onSuccess: (_result, { taskId, data }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignedTasks() });
      // 3時間超過理由はレポート側の表示にも影響するため更新された場合のみ invalidate する
      if ('over3Reason' in data) {
        queryClient.invalidateQueries({ queryKey: ['reports'] });
      }
    },
  });
}

/**
 * タスク削除 mutation
 * DELETE /api/tasks/:id
 */
export function useDeleteTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      apiClient<{ success: boolean }>(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        getToken,
      }),
    onSuccess: (_result, taskId) => {
      queryClient.removeQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignedTasks() });
    },
  });
}
