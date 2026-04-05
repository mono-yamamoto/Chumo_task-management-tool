import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { AppNotification } from '../types';

interface NotificationsResponse {
  notifications: AppNotification[];
  hasMore: boolean;
}

interface UnreadCountResponse {
  count: number;
}

/**
 * 未読通知件数（バッジ用）
 * 30秒ポーリングで自動更新
 */
export function useUnreadNotificationCount() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.unreadNotificationCount(),
    queryFn: () =>
      apiClient<UnreadCountResponse>('/api/notifications/unread-count', { getToken }).then(
        (res) => res.count
      ),
    enabled: isSignedIn,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });
}

/**
 * 通知一覧
 * ポップオーバーが開いた時だけ取得
 */
export function useNotifications(enabled: boolean) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () =>
      apiClient<NotificationsResponse>('/api/notifications?limit=20', { getToken }).then(
        (res) => res.notifications
      ),
    enabled: isSignedIn && enabled,
    staleTime: 1000 * 30,
  });
}

/**
 * 通知を既読にする
 */
export function useMarkNotificationsRead() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { notificationIds?: string[]; all?: boolean }) =>
      apiClient<{ success: boolean }>('/api/notifications/mark-read', {
        method: 'POST',
        body: data,
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount() });
    },
  });
}
