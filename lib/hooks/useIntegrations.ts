'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/useAuth';

export function useDriveIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createDriveFolder = useMutation({
    mutationFn: async ({
      projectId,
      taskId,
    }: {
      projectId: string;
      taskId: string;
    }) => {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      // Firebase Functions v2では関数ごとにURLが割り当てられる
      // 環境変数は古い形式（v1）のURLを参照している可能性があるため、常にデフォルトのURLを使用
      const driveUrl = 'https://createdrivefolder-zbk3yr5vta-uc.a.run.app';
      console.debug('Creating drive folder with:', { projectId, taskId, userId: user.id });
      const response = await fetch(
        `${driveUrl}/projects/${projectId}/tasks/${taskId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;

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
    mutationFn: async ({
      projectId,
      taskId,
    }: {
      projectId: string;
      taskId: string;
    }) => {
      // Firebase Functions v2では関数ごとにURLが割り当てられる
      // 環境変数は古い形式（v1）のURLを参照している可能性があるため、常にデフォルトのURLを使用
      const fireUrl = 'https://createfireissue-zbk3yr5vta-uc.a.run.app';
      const response = await fetch(
        `${fireUrl}/projects/${projectId}/tasks/${taskId}`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
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
