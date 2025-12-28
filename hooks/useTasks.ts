'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDoc, updateDoc, deleteDoc, doc, collection, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task } from '@/types';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import { fetchTaskByIdAcrossProjects, fetchTaskPage } from '@/lib/firestore/repositories/taskRepository';
type ProjectCursorMap = Partial<Record<ProjectType, QueryDocumentSnapshot | null>>;
type TaskPage = {
  tasks: (Task & { projectType: ProjectType })[];
  lastDoc: QueryDocumentSnapshot | ProjectCursorMap | null;
  hasMore: boolean;
};

/**
 * タスク一覧を取得するカスタムフック（無限スクロール対応）
 * @param projectType プロジェクトタイプ（'all'の場合は全プロジェクト、無限スクロール非対応）
 */
export function useTasks(projectType: ProjectType | 'all' | undefined = 'all') {
  const INITIAL_LIMIT = 10;
  const LOAD_MORE_LIMIT = 10;

  const normalizedProjectType: ProjectType | 'all' =
    projectType === undefined || projectType === null ? 'all' : projectType;
  const isAllProjects = normalizedProjectType === 'all';

  const infiniteQuery = useInfiniteQuery<TaskPage>({
    queryKey: queryKeys.tasks(isAllProjects ? 'all' : normalizedProjectType),
    queryFn: async ({
      pageParam,
    }: {
      pageParam: QueryDocumentSnapshot | ProjectCursorMap | null | undefined;
    }) => {
      if (!db) {
        return {
          tasks: [],
          lastDoc: null,
          hasMore: false,
        };
      }

      const limitValue = pageParam ? LOAD_MORE_LIMIT : INITIAL_LIMIT;

      if (isAllProjects) {
        const cursorMap = (pageParam as ProjectCursorMap | null) ?? {};
        const perProjectSnapshots: Record<ProjectType, QueryDocumentSnapshot[]> = {} as Record<
          ProjectType,
          QueryDocumentSnapshot[]
        >;
        const perProjectTasks: Record<ProjectType, (Task & { projectType: ProjectType })[]> = {} as Record<
          ProjectType,
          (Task & { projectType: ProjectType })[]
        >;

        for (const projectType of PROJECT_TYPES) {
          const cursor = cursorMap[projectType] || null;
          const page = await fetchTaskPage({
            projectType,
            limitValue,
            cursor,
          });
          perProjectSnapshots[projectType] = page.snapshots;
          perProjectTasks[projectType] = page.tasks;
        }

        const mergedTasks = PROJECT_TYPES.flatMap((type) => perProjectTasks[type]).sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });

        const pageTasks = mergedTasks.slice(0, limitValue);
        const consumedCounts = PROJECT_TYPES.reduce(
          (acc, type) => ({ ...acc, [type]: 0 }),
          {} as Record<ProjectType, number>
        );
        pageTasks.forEach((task) => {
          consumedCounts[task.projectType] += 1;
        });

        const nextCursorMap: ProjectCursorMap = { ...cursorMap };
        for (const projectType of PROJECT_TYPES) {
          const consumed = consumedCounts[projectType];
          if (consumed > 0) {
            nextCursorMap[projectType] = perProjectSnapshots[projectType][consumed - 1] || null;
          }
        }

        const totalFetched = mergedTasks.length;
        const hasLeftoverWithinBatch = totalFetched > limitValue;
        const projectMayHaveMore = PROJECT_TYPES.some(
          (type) => perProjectSnapshots[type].length === limitValue
        );
        const hasMore = hasLeftoverWithinBatch || projectMayHaveMore;

        return {
          tasks: pageTasks,
          lastDoc: nextCursorMap,
          hasMore,
        };
      }

      const cursor = pageParam as QueryDocumentSnapshot | null | undefined;
      const page = await fetchTaskPage({
        projectType: normalizedProjectType as ProjectType,
        limitValue,
        cursor,
      });

      return {
        tasks: page.tasks,
        lastDoc: page.lastDoc,
        hasMore: page.hasMore,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.hasMore || !lastPage.lastDoc) {
        return undefined;
      }
      return lastPage.lastDoc;
    },
    initialPageParam: (isAllProjects ? ({} as ProjectCursorMap) : null) as
      | ProjectCursorMap
      | QueryDocumentSnapshot
      | null,
    enabled: !!db,
  });

  return infiniteQuery;
}

/**
 * タスク詳細を取得するカスタムフック
 * @param taskId タスクID
 */
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: taskId ? queryKeys.task(taskId) : ['task', null],
    queryFn: async () => {
      if (!db || !taskId) return null;
      return fetchTaskByIdAcrossProjects(taskId);
    },
    enabled: !!taskId,
  });
}

/**
 * タスクを作成するmutation
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      projectType,
      taskData,
    }: {
      projectType: ProjectType;
      taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
    }) => {
      if (!user || !db) {
        throw new Error('ユーザーがログインしていません');
      }

      const data = {
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'projects', projectType, 'tasks'), data);
      return docRef.id;
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
      if (!db) throw new Error('Firestore is not initialized');

      const taskRef = doc(db, 'projects', projectType, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date(),
      });
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

  return useMutation({
    mutationFn: async ({
      projectType,
      taskId,
    }: {
      projectType: ProjectType;
      taskId: string;
    }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const taskRef = doc(db, 'projects', projectType, 'tasks', taskId);
      await deleteDoc(taskRef);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(variables.projectType) });
      queryClient.refetchQueries({ queryKey: queryKeys.tasks('all') });
    },
  });
}
