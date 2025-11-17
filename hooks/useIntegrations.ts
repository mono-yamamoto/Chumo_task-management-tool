'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getCreateDriveFolderUrl, getCreateFireIssueUrl } from '@/utils/functions';

export function useDriveIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createDriveFolder = useMutation({
    mutationFn: async ({ projectType, taskId }: { projectType: string; taskId: string }) => {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      const driveUrl = getCreateDriveFolderUrl();
      console.debug('Creating drive folder with:', { projectType, taskId, userId: user.id });
      const response = await fetch(`${driveUrl}/projects/${projectType}/tasks/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;

        // 認証が必要なエラーの場合、特別なエラーを投げる
        if (errorData.requiresAuth) {
          throw new Error(errorMessage);
        }

        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task'] });
    },
  });

  return {
    createDriveFolder,
  };
}

export function useFireIntegration() {
  const queryClient = useQueryClient();

  const createFireIssue = useMutation({
    mutationFn: async ({ projectType, taskId }: { projectType: string; taskId: string }) => {
      const fireUrl = getCreateFireIssueUrl();
      const response = await fetch(`${fireUrl}/projects/${projectType}/tasks/${taskId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task'] });
    },
  });

  return {
    createFireIssue,
  };
}

