'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  arrayUnion,
  writeBatch,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TaskComment } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import { fetchTaskComments } from '@/lib/firestore/repositories/commentRepository';

/**
 * タスクのコメントを取得するカスタムフック
 * @param projectType プロジェクトタイプ
 * @param taskId タスクID
 */
export function useTaskComments(projectType: string | null, taskId: string | null) {
  return useQuery({
    queryKey: taskId ? queryKeys.taskComments(taskId) : ['taskComments', null],
    queryFn: async () => {
      if (!projectType || !taskId) return [];
      return fetchTaskComments(projectType, taskId);
    },
    enabled: !!projectType && !!taskId,
    retry: false,
  });
}

/**
 * コメントを作成するmutation
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectType,
      taskId,
      authorId,
      content,
    }: {
      projectType: string;
      taskId: string;
      authorId: string;
      content: string;
    }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const commentsRef = collection(db, 'projects', projectType, 'taskComments');
      const now = new Date();

      const docRef = await addDoc(commentsRef, {
        taskId,
        authorId,
        content,
        readBy: [authorId], // 作成者は自動的に既読
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

      return docRef.id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(variables.taskId),
      });
      // 未読コメント一覧も更新
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'unreadComments',
      });
    },
  });
}

/**
 * コメントを更新するmutation
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectType,
      commentId,
      content,
      taskId: _taskId,
    }: {
      projectType: string;
      commentId: string;
      content: string;
      taskId: string;
    }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const commentRef = doc(db, 'projects', projectType, 'taskComments', commentId);
      await updateDoc(commentRef, {
        content,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(variables.taskId),
      });
    },
  });
}

/**
 * コメントを削除するmutation
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectType,
      commentId,
      taskId: _taskId,
    }: {
      projectType: string;
      commentId: string;
      taskId: string;
    }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const commentRef = doc(db, 'projects', projectType, 'taskComments', commentId);
      await deleteDoc(commentRef);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(variables.taskId),
      });
      // 未読コメント一覧も更新
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'unreadComments',
      });
    },
  });
}

/**
 * タスクの全コメントを既読にするmutation
 */
export function useMarkCommentsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectType,
      taskId,
      userId,
    }: {
      projectType: string;
      taskId: string;
      userId: string;
    }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const commentsRef = collection(db, 'projects', projectType, 'taskComments');
      const q = query(commentsRef, where('taskId', '==', taskId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((docItem) => {
        const data = docItem.data();
        const readBy = Array.isArray(data.readBy) ? data.readBy : [];
        // まだ既読にしていない場合のみ更新
        if (!readBy.includes(userId)) {
          batch.update(docItem.ref, {
            readBy: arrayUnion(userId),
          });
        }
      });

      await batch.commit();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(variables.taskId),
      });
      // 未読コメント一覧も更新
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'unreadComments',
      });
    },
  });
}

/**
 * タスクのコメント管理に必要なすべてのhooksを提供するカスタムフック
 */
export function useTaskCommentsManager(
  projectType: string | null,
  taskId: string | null,
  userId: string | null
) {
  const commentsQuery = useTaskComments(projectType, taskId);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const markAsRead = useMarkCommentsAsRead();

  // 未読コメント数を計算
  const unreadCount =
    userId && commentsQuery.data
      ? commentsQuery.data.filter((comment: TaskComment) => !comment.readBy.includes(userId)).length
      : 0;

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    error: commentsQuery.error,
    unreadCount,
    createComment,
    updateComment,
    deleteComment,
    markAsRead,
    refetch: commentsQuery.refetch,
  };
}
