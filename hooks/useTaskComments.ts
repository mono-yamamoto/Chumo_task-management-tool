'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskComment } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchTaskComments,
  createComment,
  updateComment,
  deleteComment,
  markCommentsAsRead,
} from '@/lib/api/commentRepository';

/**
 * タスクのコメントを取得するカスタムフック
 * @param projectType プロジェクトタイプ
 * @param taskId タスクID
 */
export function useTaskComments(projectType: string | null, taskId: string | null) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: taskId ? queryKeys.taskComments(taskId) : ['taskComments', null],
    queryFn: async () => {
      if (!projectType || !taskId) return [];
      return fetchTaskComments(projectType, taskId, getToken);
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
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      projectType: string;
      taskId: string;
      authorId: string;
      content: string;
      mentionedUserIds?: string[];
    }) => {
      return createComment(params, getToken);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(variables.taskId),
      });
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
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      projectType: string;
      commentId: string;
      content: string;
      mentionedUserIds?: string[];
      taskId: string;
    }) => {
      await updateComment(
        {
          projectType: params.projectType,
          commentId: params.commentId,
          content: params.content,
          mentionedUserIds: params.mentionedUserIds,
        },
        getToken
      );
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
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (params: { projectType: string; commentId: string; taskId: string }) => {
      await deleteComment(params.projectType, params.commentId, getToken);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(variables.taskId),
      });
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
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (params: { projectType: string; taskId: string; userId: string }) => {
      await markCommentsAsRead(params, getToken);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(variables.taskId),
      });
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
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();
  const markAsRead = useMarkCommentsAsRead();

  const unreadCount =
    userId && commentsQuery.data
      ? commentsQuery.data.filter((comment: TaskComment) => !comment.readBy.includes(userId)).length
      : 0;

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    error: commentsQuery.error,
    unreadCount,
    createComment: createCommentMutation,
    updateComment: updateCommentMutation,
    deleteComment: deleteCommentMutation,
    markAsRead,
    refetch: commentsQuery.refetch,
  };
}
