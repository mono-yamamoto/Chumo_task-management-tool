import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { Task } from '../types';

interface OrderUpdate {
  taskId: string;
  projectType: string;
  newOrder: number;
}

/**
 * タスクの並び順を一括更新する mutation（楽観的更新付き）
 * PUT /api/tasks/order
 */
export function useReorderTasks() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: OrderUpdate[]) =>
      apiClient<{ success: boolean }>('/api/tasks/order', {
        method: 'PUT',
        body: { updates },
        getToken,
      }),

    onMutate: async (updates) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks() });
      await queryClient.cancelQueries({ queryKey: queryKeys.assignedTasks() });

      // ロールバック用スナップショット
      const snapshots = new Map<string, unknown>();

      // order の変更マップ
      const orderMap = new Map(updates.map((u) => [u.taskId, u.newOrder]));

      // タスクの order を更新するヘルパー
      const updateTaskOrder = (task: Task): Task => {
        const newOrder = orderMap.get(task.id);
        return newOrder != null ? { ...task, order: newOrder } : task;
      };

      // 全てのタスク関連キャッシュを走査して型に応じて更新
      queryClient.getQueriesData({ queryKey: ['tasks'] }).forEach(([key, data]) => {
        if (!data) return;
        const keyStr = JSON.stringify(key);

        if (Array.isArray(data)) {
          // Task[] 形式（useAssignedTasks の .then(res => res.tasks) でアンラップ済み）
          snapshots.set(keyStr, data);
          queryClient.setQueryData(key, (data as Task[]).map(updateTaskOrder));
        } else if (typeof data === 'object' && 'tasks' in (data as Record<string, unknown>)) {
          // { tasks: Task[], hasMore?: boolean } 形式（useTasks）
          const obj = data as { tasks: Task[]; hasMore?: boolean };
          snapshots.set(keyStr, data);
          queryClient.setQueryData(key, { ...obj, tasks: obj.tasks.map(updateTaskOrder) });
        }
      });

      return { snapshots };
    },

    onError: (_err, _vars, context) => {
      // ロールバック
      if (context?.snapshots) {
        for (const [keyStr, data] of context.snapshots) {
          const key = JSON.parse(keyStr);
          queryClient.setQueryData(key, data);
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignedTasks() });
    },
  });
}
