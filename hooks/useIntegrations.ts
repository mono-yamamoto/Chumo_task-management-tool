'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/http/apiClient';
import { HttpError } from '@/lib/http/fetchJson';
import { queryKeys } from '@/lib/queryKeys';

type DriveFolderResult = {
  warning?: boolean;
  url?: string;
  error?: string;
};

export function useDriveIntegration() {
  const queryClient = useQueryClient();
  const { user, getToken } = useAuth();

  const createDriveFolder = useMutation<
    DriveFolderResult,
    Error,
    { projectType: string; taskId: string }
  >({
    mutationFn: async ({ projectType, taskId }: { projectType: string; taskId: string }) => {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      try {
        return await apiClient<DriveFolderResult>('/api/drive/folders', {
          method: 'POST',
          body: { projectType, taskId },
          getToken,
        });
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
  const { getToken } = useAuth();

  const createFireIssue = useMutation({
    mutationFn: async ({ projectType, taskId }: { projectType: string; taskId: string }) => {
      return apiClient('/api/github/issues', {
        method: 'POST',
        body: { projectType, taskId },
        getToken,
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
  const { getToken } = useAuth();

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
      return apiClient('/api/chat/threads', {
        method: 'POST',
        body: { projectType, taskId, taskUrl },
        getToken,
      });
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
