import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';

interface SessionReminderResponse {
  success: boolean;
  sentCount: number;
}

/**
 * セッション未記録通知を送信
 */
export function useSendSessionReminder() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; targetUserIds: string[] }) =>
      apiClient<SessionReminderResponse>('/api/notifications/session-reminder', {
        method: 'POST',
        body: data,
        getToken,
      }),
    onSuccess: (_result, { taskId }) => {
      // タスクの sessionReminders が更新されるのでタスク関連のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount() });
    },
  });
}
