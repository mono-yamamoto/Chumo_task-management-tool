import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { TaskComment } from '../types';

interface CommentsResponse {
  comments: TaskComment[];
}

interface UnreadResponse {
  taskIds: string[];
}

/**
 * タスクのコメント一覧を取得
 * GET /api/comments?taskId=xxx&projectType=xxx
 */
export function useTaskComments(taskId: string | null, projectType: string | null) {
  const { getToken, isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const hasMarkedAsRead = useRef(false);

  const query = useQuery({
    queryKey: queryKeys.comments(taskId ?? ''),
    queryFn: () =>
      apiClient<CommentsResponse>(`/api/comments?taskId=${taskId}&projectType=${projectType}`, {
        getToken,
      }).then((res) => res.comments),
    enabled: isSignedIn && taskId != null && projectType != null,
  });

  // コメントタブを開いた時に既読マーク
  useEffect(() => {
    if (
      query.data &&
      query.data.length > 0 &&
      taskId &&
      projectType &&
      userId &&
      !hasMarkedAsRead.current
    ) {
      const hasUnread = query.data.some((c) => !c.readBy.includes(userId));
      if (hasUnread) {
        hasMarkedAsRead.current = true;
        apiClient('/api/comments/mark-read', {
          method: 'POST',
          body: { taskId, projectType },
          getToken,
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.unreadComments() });
        });
      }
    }
  }, [query.data, taskId, projectType, userId, getToken, queryClient]);

  return query;
}

/**
 * 未読コメントがあるタスクID一覧
 * GET /api/comments/unread
 */
export function useUnreadComments() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.unreadComments(),
    queryFn: () =>
      apiClient<UnreadResponse>('/api/comments/unread', { getToken }).then(
        (res) => new Set(res.taskIds)
      ),
    enabled: isSignedIn,
    staleTime: 1000 * 30, // 30秒
  });
}

/**
 * コメント作成
 */
export function useCreateComment() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      taskId: string;
      projectType: string;
      content: string;
      mentionedUserIds?: string[];
    }) =>
      apiClient<{ id: string }>('/api/comments', {
        method: 'POST',
        body: data,
        getToken,
      }),
    onSuccess: (_result, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadComments() });
    },
  });
}

/**
 * コメント更新
 */
export function useUpdateComment() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      content,
      mentionedUserIds,
      taskId: _taskId,
    }: {
      commentId: string;
      content: string;
      mentionedUserIds?: string[];
      taskId: string;
    }) =>
      apiClient<{ success: boolean }>(`/api/comments/${commentId}`, {
        method: 'PUT',
        body: { content, mentionedUserIds },
        getToken,
      }),
    onSuccess: (_result, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(taskId) });
    },
  });
}

/**
 * コメント削除
 */
export function useDeleteComment() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, taskId: _taskId }: { commentId: string; taskId: string }) =>
      apiClient<{ success: boolean }>(`/api/comments/${commentId}`, {
        method: 'DELETE',
        getToken,
      }),
    onSuccess: (_result, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadComments() });
    },
  });
}
