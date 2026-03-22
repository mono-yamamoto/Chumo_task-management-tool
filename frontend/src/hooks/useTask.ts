import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { Task } from '../types';

interface TaskResponse {
  task: Task;
}

/**
 * 単一タスクを取得
 * GET /api/tasks/:id
 */
export function useTask(taskId: string | null) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.task(taskId ?? ''),
    queryFn: () =>
      apiClient<TaskResponse>(`/api/tasks/${taskId}`, { getToken }).then((res) => res.task),
    enabled: isSignedIn && taskId != null,
  });
}
