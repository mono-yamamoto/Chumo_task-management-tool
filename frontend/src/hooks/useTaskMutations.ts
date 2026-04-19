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
    onSuccess: (_result, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignedTasks() });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
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
