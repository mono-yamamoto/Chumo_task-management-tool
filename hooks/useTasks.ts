'use client';

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { Task } from '@/types';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchTaskByIdAcrossProjects,
  fetchTaskPage,
  createTask,
  updateTask,
  deleteTask,
} from '@/lib/api/taskRepository';

type TaskPage = {
  tasks: (Task & { projectType: ProjectType })[];
  hasMore: boolean;
  nextOffset: number;
};

/**
 * タスク一覧を取得するカスタムフック（無限スクロール対応）
 * @param projectType プロジェクトタイプ（'all'の場合は全プロジェクト）
 */
export function useTasks(
  projectType: ProjectType | 'all' | undefined = 'all'
): UseInfiniteQueryResult<InfiniteData<TaskPage>, Error> {
  const INITIAL_LIMIT = 10;
  const LOAD_MORE_LIMIT = 10;
  const { getToken } = useAuth();

  const normalizedProjectType: ProjectType | 'all' =
    projectType === undefined || projectType === null ? 'all' : projectType;
  const isAllProjects = normalizedProjectType === 'all';

  const infiniteQuery = useInfiniteQuery<
    TaskPage,
    Error,
    InfiniteData<TaskPage>,
    ReturnType<typeof queryKeys.tasks>,
    number
  >({
    queryKey: queryKeys.tasks(isAllProjects ? 'all' : normalizedProjectType),
    queryFn: async ({ pageParam }) => {
      const limitValue = pageParam > 0 ? LOAD_MORE_LIMIT : INITIAL_LIMIT;
      const offset = pageParam;

      if (isAllProjects) {
        // 全プロジェクトタイプから取得してマージ
        const results = await Promise.all(
          PROJECT_TYPES.map(async (pt) => {
            try {
              return await fetchTaskPage({
                projectType: pt,
                limitValue,
                offset,
                getToken,
              });
            } catch (error) {
              console.error(`Failed to fetch tasks for ${pt}:`, error);
              return { tasks: [], hasMore: false };
            }
          })
        );

        const mergedTasks = results
          .flatMap((r) => r.tasks)
          .sort((a, b) => {
            const aTime = a.createdAt?.getTime() || 0;
            const bTime = b.createdAt?.getTime() || 0;
            return bTime - aTime;
          });

        const pageTasks = mergedTasks.slice(0, limitValue);
        const hasMore = results.some((r) => r.hasMore) || mergedTasks.length > limitValue;

        return {
          tasks: pageTasks,
          hasMore,
          nextOffset: offset + limitValue,
        };
      }

      const page = await fetchTaskPage({
        projectType: normalizedProjectType as ProjectType,
        limitValue,
        offset,
        getToken,
      });

      return {
        tasks: page.tasks,
        hasMore: page.hasMore,
        nextOffset: offset + limitValue,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.hasMore) {
        return undefined;
      }
      return lastPage.nextOffset;
    },
    initialPageParam: 0,
  });

  return infiniteQuery;
}

/**
 * タスク詳細を取得するカスタムフック
 * @param taskId タスクID
 */
export function useTask(taskId: string | null) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: taskId ? queryKeys.task(taskId) : ['task', null],
    queryFn: async () => {
      if (!taskId) return null;
      return fetchTaskByIdAcrossProjects(taskId, getToken);
    },
    enabled: !!taskId,
  });
}

/**
 * タスクを作成するmutation
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user, getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      projectType,
      taskData,
    }: {
      projectType: ProjectType;
      taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
    }) => {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }
      return createTask(projectType, taskData, getToken);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(variables.projectType) });
      queryClient.refetchQueries({ queryKey: queryKeys.tasks('all') });
    },
  });
}

/**
 * タスクを更新するmutation
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      projectType,
      taskId,
      updates,
    }: {
      projectType: ProjectType;
      taskId: string;
      updates: Partial<Task>;
    }) => {
      await updateTask(projectType, taskId, updates, getToken);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(variables.projectType) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(variables.taskId) });
      queryClient.refetchQueries({ queryKey: queryKeys.tasks('all') });
    },
  });
}

/**
 * タスクを削除するmutation
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ projectType, taskId }: { projectType: ProjectType; taskId: string }) => {
      await deleteTask(projectType, taskId, getToken);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(variables.projectType) });
      queryClient.refetchQueries({ queryKey: queryKeys.tasks('all') });
    },
  });
}
