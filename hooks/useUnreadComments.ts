'use client';

import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { queryKeys } from '@/lib/queryKeys';
import { fetchUnreadCommentTaskIds } from '@/lib/firestore/repositories/commentRepository';

// 未読コメントの更新間隔（60秒）
const UNREAD_COMMENTS_REFETCH_INTERVAL_MS = 60000;

/**
 * 未読コメントがあるタスクIDのセットを取得するカスタムフック
 * @param userId ユーザーID
 */
export function useUnreadComments(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.unreadComments(userId),
    queryFn: async () => {
      if (!userId || !db) return new Set<string>();
      return fetchUnreadCommentTaskIds(userId);
    },
    enabled: !!userId && !!db,
    refetchInterval: UNREAD_COMMENTS_REFETCH_INTERVAL_MS,
    // SetはJSON化できないため、シリアライズされた比較を避ける
    structuralSharing: false,
  });
}

/**
 * 特定のタスクに未読コメントがあるかどうかを確認するカスタムフック
 * @param userId ユーザーID
 * @param taskId タスクID
 */
export function useHasUnreadComments(userId: string | null, taskId: string | null) {
  const { data: unreadTaskIds, isLoading } = useUnreadComments(userId);

  const hasUnread = taskId && unreadTaskIds ? unreadTaskIds.has(taskId) : false;

  return {
    hasUnread,
    isLoading,
  };
}
