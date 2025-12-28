'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TaskSession } from '@/types';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchActiveSessionsByUser,
  fetchTaskSessions,
} from '@/lib/firestore/repositories/sessionRepository';

/**
 * タスクのセッション履歴を取得するカスタムフック
 * @param projectType プロジェクトタイプ
 * @param taskId タスクID
 */
export function useTaskSessions(projectType: string | null, taskId: string | null) {
  return useQuery({
    queryKey: taskId ? queryKeys.taskSessions(taskId) : ['taskSessions', null],
    queryFn: async () => {
      if (!projectType || !taskId) return [];
      return fetchTaskSessions(projectType, taskId);
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
  onActiveSessionChange?: (_session: {
    projectType: string;
    taskId: string;
    sessionId: string;
  } | null) => void
) {
  return useQuery({
    queryKey: queryKeys.activeSession(userId ?? null),
    queryFn: async () => {
      if (!userId || !db) return null;
      const allSessions = await fetchActiveSessionsByUser(userId);

      if (allSessions.length > 0) {
        const firstSession = allSessions[0];
        const activeSession = {
          projectType: firstSession.projectType,
          taskId: firstSession.session.taskId,
          sessionId: firstSession.sessionId,
        };
        onActiveSessionChange?.(activeSession);
        return firstSession.session;
      }

      onActiveSessionChange?.(null);
      return null;
    },
    enabled: !!userId && !!db,
    refetchInterval: 5000, // 5秒ごとに再取得
  });
}

/**
 * セッションを追加するmutation
 */
export function useAddSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectType,
      sessionData,
    }: {
      projectType: string;
      sessionData: {
        taskId: string;
        userId: string;
        startedAt: Date;
        endedAt: Date | null;
        note?: string | null;
      };
    }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');

      // startedAtとendedAtからdurationSecを計算
      let durationSec = 0;
      if (sessionData.startedAt && sessionData.endedAt) {
        durationSec = Math.floor(
          (sessionData.endedAt.getTime() - sessionData.startedAt.getTime()) / 1000
        );
      }

      await addDoc(sessionsRef, {
        ...sessionData,
        durationSec,
        startedAt: Timestamp.fromDate(sessionData.startedAt),
        endedAt: sessionData.endedAt ? Timestamp.fromDate(sessionData.endedAt) : null,
      });
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

  return useMutation({
    mutationFn: async ({
      projectType,
      sessionId,
      updates,
      existingSession,
    }: {
      projectType: string;
      sessionId: string;
      updates: Partial<{
        startedAt: Date | Timestamp;
        endedAt: Date | Timestamp | null;
        userId: string;
        note: string | null;
      }>;
      existingSession?: TaskSession;
    }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const sessionRef = doc(db, 'projects', projectType, 'taskSessions', sessionId);

      // startedAtとendedAtを更新する場合、durationSecも再計算
      const updateData: any = {};
      if (updates.startedAt) {
        updateData.startedAt =
          updates.startedAt instanceof Date
            ? Timestamp.fromDate(updates.startedAt)
            : updates.startedAt;
      }
      if (updates.endedAt !== undefined) {
        updateData.endedAt =
          updates.endedAt === null
            ? null
            : updates.endedAt instanceof Date
              ? Timestamp.fromDate(updates.endedAt)
              : updates.endedAt;
      }
      if (updates.userId) {
        updateData.userId = updates.userId;
      }
      if (updates.note !== undefined) {
        updateData.note = updates.note;
      }

      // durationSecを再計算
      let startedAt: Date | undefined;
      if (updates.startedAt) {
        startedAt =
          updates.startedAt instanceof Date
            ? updates.startedAt
            : (updates.startedAt as Timestamp).toDate();
      } else {
        startedAt = existingSession?.startedAt;
      }

      let endedAt: Date | null | undefined;
      if (updates.endedAt !== null && updates.endedAt !== undefined) {
        endedAt =
          updates.endedAt instanceof Date
            ? updates.endedAt
            : (updates.endedAt as Timestamp).toDate();
      } else if (updates.endedAt === null) {
        endedAt = null;
      } else {
        endedAt = existingSession?.endedAt || null;
      }

      if (startedAt && endedAt) {
        updateData.durationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      }

      await updateDoc(sessionRef, updateData);
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
        queryClient.invalidateQueries({ queryKey: ['taskSessions'] });
        queryClient.invalidateQueries({ queryKey: ['sessionHistory'] });
      }
    },
  });
}

/**
 * セッションを削除するmutation
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      projectType: string;
      sessionId: string;
      taskId: string;
    }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const sessionRef = doc(db, 'projects', variables.projectType, 'taskSessions', variables.sessionId);
      await deleteDoc(sessionRef);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskSessions(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory(variables.taskId) });
    },
  });
}
