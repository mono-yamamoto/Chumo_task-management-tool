import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';

export interface IntegrationResult {
  success: boolean;
  url: string;
  alreadyExists?: boolean;
  requiresAuth?: boolean;
  warning?: string;
}

/**
 * タスクドロワーの外部連携ボタン用 mutation hooks
 */
export function useIntegrations() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
  };

  const createDriveFolder = useMutation({
    mutationFn: (taskId: string) =>
      apiClient<IntegrationResult>('/api/drive/folders', {
        method: 'POST',
        body: { taskId },
        getToken,
      }),
    onSuccess: invalidateTasks,
  });

  const createChatThread = useMutation({
    mutationFn: (taskId: string) =>
      apiClient<IntegrationResult>('/api/chat/threads', {
        method: 'POST',
        body: { taskId },
        getToken,
      }),
    onSuccess: invalidateTasks,
  });

  const createFireIssue = useMutation({
    mutationFn: (taskId: string) =>
      apiClient<IntegrationResult>('/api/github/issues', {
        method: 'POST',
        body: { taskId },
        getToken,
      }),
    onSuccess: invalidateTasks,
  });

  const createPetIssue = useMutation({
    mutationFn: (taskId: string) =>
      apiClient<IntegrationResult>('/api/github/pet-issues', {
        method: 'POST',
        body: { taskId },
        getToken,
      }),
    onSuccess: invalidateTasks,
  });

  return { createDriveFolder, createChatThread, createFireIssue, createPetIssue };
}
