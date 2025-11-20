'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task } from '@/types';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { useAuth } from '@/hooks/useAuth';
type ProjectCursorMap = Partial<Record<ProjectType, QueryDocumentSnapshot | null>>;

/**
 * タスクデータをFirestoreから取得して変換する共通関数
 */
function transformTaskData(
  docItem: any,
  projectTypeOverride?: ProjectType
): Task & { projectType: ProjectType } {
  const taskData = docItem.data();
  const resolvedProjectType =
    projectTypeOverride ||
    (taskData.projectType as ProjectType | undefined) ||
    (docItem?.ref?.parent?.parent?.id as ProjectType | undefined);

  if (!resolvedProjectType) {
    throw new Error('projectType is required to transform task data');
  }

  return {
    id: docItem.id,
    projectType: resolvedProjectType,
    ...taskData,
    createdAt: taskData.createdAt?.toDate(),
    updatedAt: taskData.updatedAt?.toDate(),
    itUpDate: taskData.itUpDate?.toDate() || null,
    releaseDate: taskData.releaseDate?.toDate() || null,
    dueDate: taskData.dueDate?.toDate() || null,
    completedAt: taskData.completedAt?.toDate() || null,
  } as Task & { projectType: ProjectType };
}

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

  const infiniteQueryKey = ['tasks', isAllProjects ? 'all' : normalizedProjectType] as const;
  const infiniteQuery = useInfiniteQuery({
    queryKey: infiniteQueryKey,
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
          const baseRef = collection(db, 'projects', projectType, 'tasks');
          const constraints = cursor
            ? [orderBy('createdAt', 'desc'), startAfter(cursor), limit(limitValue)]
            : [orderBy('createdAt', 'desc'), limit(limitValue)];
          const snapshot = await getDocs(query(baseRef, ...constraints));
          perProjectSnapshots[projectType] = snapshot.docs;
          perProjectTasks[projectType] = snapshot.docs.map((docItem) => transformTaskData(docItem, projectType));
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

      const baseRef = collection(db, 'projects', normalizedProjectType, 'tasks');
      const cursor = pageParam as QueryDocumentSnapshot | null | undefined;
      const constraints = cursor
        ? [orderBy('createdAt', 'desc'), startAfter(cursor), limit(limitValue)]
        : [orderBy('createdAt', 'desc'), limit(limitValue)];
      const snapshot = await getDocs(query(baseRef, ...constraints));

      if (!snapshot || !snapshot.docs) {
        return {
          tasks: [],
          lastDoc: null,
          hasMore: false,
        };
      }

      const tasks = snapshot.docs.map((docItem) =>
        transformTaskData(docItem, normalizedProjectType as ProjectType)
      );
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      const hasMore = snapshot.docs.length === limitValue;

      return {
        tasks,
        lastDoc: lastDoc as QueryDocumentSnapshot | null,
        hasMore,
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

  return infiniteQuery as any;
}

/**
 * タスク詳細を取得するカスタムフック
 * @param taskId タスクID
 */
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!db || !taskId) return null;

      // 全プロジェクトタイプから検索
      for (const projectType of PROJECT_TYPES) {
        const taskRef = doc(db, 'projects', projectType, 'tasks', taskId);
        const taskDoc = await getDoc(taskRef);
        if (taskDoc.exists()) {
          const taskData = taskDoc.data();
          return {
            id: taskDoc.id,
            ...taskData,
            createdAt: taskData.createdAt?.toDate(),
            updatedAt: taskData.updatedAt?.toDate(),
            itUpDate: taskData.itUpDate?.toDate() || null,
            releaseDate: taskData.releaseDate?.toDate() || null,
            dueDate: taskData.dueDate?.toDate() || null,
            completedAt: taskData.completedAt?.toDate() || null,
          } as Task;
        }
      }
      return null;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      queryClient.refetchQueries({ queryKey: ['tasks'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.refetchQueries({ queryKey: ['tasks'] });
    },
  });
}

