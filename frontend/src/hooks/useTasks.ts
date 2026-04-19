import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { Task } from '../types';

interface TasksResponse {
  tasks: Task[];
  hasMore: boolean;
}

interface AssignedTasksResponse {
  tasks: Task[];
}

interface UseTasksOptions {
  projectType?: string;
  excludeCompleted?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * タスク一覧を取得
 * GET /api/tasks?projectType=xxx&excludeCompleted=true&limit=50&offset=0
 */
export function useTasks(options: UseTasksOptions = {}) {
  const { getToken, isSignedIn } = useAuth();
  const { projectType, excludeCompleted = true, limit = 50, offset = 0 } = options;

  const params = new URLSearchParams();
  if (projectType) params.set('projectType', projectType);
  if (excludeCompleted) params.set('excludeCompleted', 'true');
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  const queryString = params.toString();

  return useQuery({
    queryKey: [...queryKeys.tasks(projectType), { excludeCompleted, limit, offset }],
    queryFn: () => apiClient<TasksResponse>(`/api/tasks?${queryString}`, { getToken }),
    enabled: isSignedIn,
  });
}

/**
 * 自分にアサインされたタスク一覧を取得（ダッシュボード用・完了含む）
 * KPIカードで完了件数を集計するため includeCompleted=true で全件取得する
 * GET /api/tasks/assigned?includeCompleted=true
 */
export function useAssignedTasks() {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.assignedTasks(userId ?? undefined),
    queryFn: () =>
      apiClient<AssignedTasksResponse>('/api/tasks/assigned?includeCompleted=true', {
        getToken,
      }).then((res) => res.tasks),
    enabled: isSignedIn,
  });
}
