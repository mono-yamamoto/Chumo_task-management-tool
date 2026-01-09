'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getCreateDriveFolderUrl,
  getCreateFireIssueUrl,
  getCreateGoogleChatThreadUrl,
} from '@/utils/functions';
import { fetchJson, HttpError } from '@/lib/http/fetchJson';
import { queryKeys } from '@/lib/queryKeys';

type DriveFolderResult = {
  warning?: boolean;
  url?: string;
  error?: string;
};

export function useDriveIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createDriveFolder = useMutation<
    DriveFolderResult,
    Error,
    { projectType: string; taskId: string }
  >({
    mutationFn: async ({ projectType, taskId }: { projectType: string; taskId: string }) => {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      const driveUrl = getCreateDriveFolderUrl();
      console.debug('Creating drive folder with:', { projectType, taskId, userId: user.id });
      try {
        return await fetchJson<DriveFolderResult>(
          `${driveUrl}/projects/${projectType}/tasks/${taskId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
            }),
          }
        );
      } catch (error) {
        if (
          error instanceof HttpError &&
          typeof error.details?.requiresAuth === 'boolean' &&
          error.details.requiresAuth
        ) {
          throw new Error(error.message);
        }
        throw error;
      }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task(variables.taskId) });
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
      return fetchJson(`${fireUrl}/projects/${projectType}/tasks/${taskId}`, {
        method: 'POST',
      });
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task(variables.taskId) });
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
        return await fetchJson(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskUrl }),
        });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks('all') });
      if (variables.taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.task(variables.taskId) });
      }
    },
  });

  return {
    createGoogleChatThread,
  };
}
