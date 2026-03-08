'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskSession, ActiveSession, ProjectType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import { ACTIVE_SESSION_REFETCH_INTERVAL_MS } from '@/constants/timer';
import {
  fetchActiveSessionsByUser,
  fetchTaskSessions,
  addSession,
  updateSession,
  deleteSession,
} from '@/lib/api/sessionRepository';

/**
 * タスクのセッション履歴を取得するカスタムフック
 * @param projectType プロジェクトタイプ
 * @param taskId タスクID
 */
export function useTaskSessions(projectType: string | null, taskId: string | null) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: taskId ? queryKeys.taskSessions(taskId) : ['taskSessions', null],
    queryFn: async () => {
      if (!projectType || !taskId) return [];
      return fetchTaskSessions(projectType, taskId, getToken);
    },
    enabled: !!projectType && !!taskId,
    retry: false,
  });
}

/**
 * アクティブなセッション（未終了）を取得するカスタムフック
 * @param userId ユーザーID
 * @param onActiveSessionChange アクティブセッションが変更されたときのコールバック
 */
export function useActiveSession(
  userId: string | null,
  onActiveSessionChange?: (_session: ActiveSession | null) => void
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: queryKeys.activeSession(userId ?? null),
    queryFn: async () => {
      if (!userId) return null;
      const allSessions = await fetchActiveSessionsByUser(userId, getToken);

      if (allSessions.length > 0) {
        const firstSession = allSessions[0];
        const activeSession = {
          projectType: firstSession.projectType as ProjectType,
          taskId: firstSession.session.taskId,
          sessionId: firstSession.sessionId,
        };
        onActiveSessionChange?.(activeSession);
        return firstSession.session;
      }

      onActiveSessionChange?.(null);
      return null;
    },
    enabled: !!userId,
    refetchInterval: ACTIVE_SESSION_REFETCH_INTERVAL_MS,
  });
}

/**
 * セッションを追加するmutation
 */
export function useAddSession() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      projectType: string;
      sessionData: {
        taskId: string;
        userId: string;
        startedAt: Date;
        endedAt: Date | null;
        note?: string | null;
      };
    }) => {
      await addSession(params, getToken);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskSessions(variables.sessionData.taskId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessionHistory(variables.sessionData.taskId),
      });
    },
  });
}

/**
 * セッションを更新するmutation
 */
export function useUpdateSession() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      projectType: string;
      sessionId: string;
      updates: Partial<{
        startedAt: Date;
        endedAt: Date | null;
        userId: string;
        note: string | null;
      }>;
      existingSession?: TaskSession;
    }) => {
      await updateSession(params, getToken);
    },
    onSuccess: (_result, variables) => {
      if (variables.existingSession?.taskId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.taskSessions(variables.existingSession.taskId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.sessionHistory(variables.existingSession.taskId),
        });
      } else {
        console.warn('taskId not available in existingSession, invalidating all task sessions');
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'taskSessions' || query.queryKey[0] === 'sessionHistory',
        });
      }
    },
  });
}

/**
 * セッションを削除するmutation
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (variables: { projectType: string; sessionId: string; taskId: string }) => {
      await deleteSession(variables.projectType, variables.sessionId, getToken);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskSessions(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(variables.taskId) });
    },
  });
}
