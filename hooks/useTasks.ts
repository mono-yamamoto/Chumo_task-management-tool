'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task, ProjectType } from '@/types';
import { PROJECT_TYPES } from '@/constants/projectTypes';
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
 * タスク一覧を取得するカスタムフック
 * @param projectType プロジェクトタイプ（'all'の場合は全プロジェクト）
 */
export function useTasks(projectType: ProjectType | 'all' = 'all') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tasks', projectType],
    queryFn: async () => {
      if (!db || !user) return [];

      if (projectType === 'all') {
        const allTasks: (Task & { projectType: ProjectType })[] = [];

        // すべてのプロジェクトタイプからタスクを取得
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
      }

      const tasksRef = collection(db, 'projects', projectType, 'tasks');
      const snapshot = await getDocs(tasksRef);
      return snapshot.docs.map((docItem) => transformTaskData(docItem, projectType));
    },
    enabled: !!user && !!db,
  });
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

