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
  Query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task } from '@/types';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { useAuth } from '@/hooks/useAuth';

/**
 * タスクデータをFirestoreから取得して変換する共通関数
 */
function transformTaskData(
  docItem: any,
  projectType: ProjectType
): Task & { projectType: ProjectType } {
  const taskData = docItem.data();
  return {
    id: docItem.id,
    projectType,
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
  const { user } = useAuth();
  const INITIAL_LIMIT = 10;
  const LOAD_MORE_LIMIT = 10;

  // projectTypeがundefined/nullの場合は'all'として扱う（明示的にチェック）
  const normalizedProjectType: ProjectType | 'all' =
    projectType === undefined || projectType === null ? 'all' : projectType;

  const allQueryKey = ['tasks', 'all'] as const;
  // 'all'の場合は従来通り全件取得（無限スクロール非対応）
  const allQuery = useQuery({
    queryKey: allQueryKey,
    queryFn: async () => {
      if (!db || !user || normalizedProjectType !== 'all') return [];

      const allTasks: (Task & { projectType: ProjectType })[] = [];

      // すべてのプロジェクトタイプからタスクを取得
      if (!PROJECT_TYPES || !Array.isArray(PROJECT_TYPES)) {
        return [];
      }
      for (const type of PROJECT_TYPES) {
        const tasksRef = collection(db, 'projects', type, 'tasks');
        const tasksSnapshot = await getDocs(tasksRef);

        tasksSnapshot.docs.forEach((docItem) => {
          allTasks.push(transformTaskData(docItem, type));
        });
      }

      return allTasks.sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime;
      });
    },
    enabled: !!user && !!db && normalizedProjectType === 'all',
  });

  // 単一プロジェクトタイプの場合は無限スクロール対応
  // queryKeyを明示的に型安全に生成（undefinedチェック付き）
  const safeProjectType: ProjectType | 'all' = normalizedProjectType ?? 'all';
  // 全件取得用クエリとキーが衝突しないよう、projectセグメントを挟む
  const infiniteQueryKey = ['tasks', 'project', safeProjectType] as const;
  const infiniteQuery = useInfiniteQuery({
    queryKey: infiniteQueryKey,
    queryFn: async ({ pageParam }: { pageParam: QueryDocumentSnapshot | null | undefined }) => {
      if (!db || !user || normalizedProjectType === 'all') {
        return {
          tasks: [],
          lastDoc: null,
          hasMore: false,
        };
      }

      const tasksRef = collection(db, 'projects', normalizedProjectType, 'tasks');

      // クエリを構築（ページネーション対応）
      let q: Query;
      if (pageParam) {
        q = query(
          tasksRef,
          orderBy('createdAt', 'desc'),
          startAfter(pageParam),
          limit(LOAD_MORE_LIMIT)
        );
      } else {
        q = query(
          tasksRef,
          orderBy('createdAt', 'desc'),
          limit(INITIAL_LIMIT)
        );
      }

      const snapshot = await getDocs(q);

      // snapshotがundefinedの場合のエラーハンドリング
      if (!snapshot || !snapshot.docs) {
        return {
          tasks: [],
          lastDoc: null,
          hasMore: false,
        };
      }

      const tasks = snapshot.docs.map((docItem) => transformTaskData(docItem, normalizedProjectType as ProjectType));
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      const expectedLimit = pageParam ? LOAD_MORE_LIMIT : INITIAL_LIMIT;
      const hasMore = snapshot.docs.length === expectedLimit;

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
    initialPageParam: null as QueryDocumentSnapshot | null,
    enabled: !!user && !!db && normalizedProjectType !== 'all',
  });

  // projectTypeに応じて適切なクエリ結果を返す
  if (normalizedProjectType === 'all') {
    return allQuery as any;
  }
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

