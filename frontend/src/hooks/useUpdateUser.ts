import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';

interface UpdateUserData {
  displayName?: string;
  githubUsername?: string;
  chatId?: string | null;
  isAllowed?: boolean;
  role?: 'admin' | 'member';
}

/**
 * ユーザー情報を更新
 * PUT /api/users/:id
 */
export function useUpdateUser() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserData }) =>
      apiClient<{ user: unknown }>(`/api/users/${userId}`, {
        method: 'PUT',
        body: data,
        getToken,
      }),
    onSuccess: (_result, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser() });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    },
  });
}
