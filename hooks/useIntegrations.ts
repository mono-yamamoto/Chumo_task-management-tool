'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getCreateDriveFolderUrl,
  getCreateFireIssueUrl,
  getCreateGoogleChatThreadUrl,
} from '@/utils/functions';

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

export function useGoogleChatIntegration() {
  const queryClient = useQueryClient();

  const createGoogleChatThread = useMutation({
    mutationFn: async ({
      projectType,
      taskId,
      taskUrl,
    }: {
      projectType: string;
      taskId: string;
      taskUrl: string;
    }) => {
      const chatUrl = getCreateGoogleChatThreadUrl();
      const requestUrl = `${chatUrl}/projects/${projectType}/tasks/${taskId}`;

      console.debug('Creating Google Chat thread:', {
        chatUrl,
        requestUrl,
        projectType,
        taskId,
        taskUrl,
      });

      try {
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          console.error('Google Chat thread creation failed:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            requestUrl,
          });
          throw new Error(errorMessage);
        }

        return response.json();
      } catch (error) {
        // fetch自体が失敗した場合（ネットワークエラー、CORSエラーなど）
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.error('Google Chat thread creation network error:', {
            requestUrl,
            error,
          });
          throw new Error(
            `ネットワークエラーが発生しました。Cloud FunctionのURLを確認してください: ${requestUrl}`
          );
        }
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (variables.taskId) {
        queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      }
    },
  });

  return {
    createGoogleChatThread,
  };
}

