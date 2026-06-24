import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import type { UserRole } from '../types';
import { useAuth } from './useAuth';

/**
 * メンバー招待
 * POST /api/users/invite
 */
export function useInviteUser() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: UserRole }) =>
      apiClient<{ success: boolean; restored?: boolean }>('/api/users/invite', {
        method: 'POST',
        body: { email, role },
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    },
  });
}
