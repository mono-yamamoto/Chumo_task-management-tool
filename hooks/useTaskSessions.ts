'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PROJECT_TYPES } from '@/constants/projectTypes';

export interface TaskSession {
  id: string;
  taskId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSec: number;
  note?: string;
}

/**
 * タスクのセッション履歴を取得するカスタムフック
 * @param projectType プロジェクトタイプ
 * @param taskId タスクID
 */
export function useTaskSessions(projectType: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ['taskSessions', taskId],
    queryFn: async () => {
      if (!projectType || !db || !taskId) return [];

      try {
        const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');
        const q = query(
          sessionsRef,
          where('taskId', '==', taskId),
          orderBy('startedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            id: docItem.id,
            ...data,
            startedAt: data.startedAt?.toDate(),
            endedAt: data.endedAt?.toDate() || null,
            durationSec: data.durationSec ?? 0,
          } as TaskSession;
        });
      } catch (error: any) {
        // インデックスエラーの場合、orderByなしで再試行
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          try {
            const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');
            const q = query(sessionsRef, where('taskId', '==', taskId));
            const snapshot = await getDocs(q);
            const sessions = snapshot.docs.map((docItem) => {
              const data = docItem.data();
              return {
                id: docItem.id,
                ...data,
                startedAt: data.startedAt?.toDate(),
                endedAt: data.endedAt?.toDate() || null,
                durationSec: data.durationSec ?? 0,
              } as TaskSession;
            });
            // クライアント側でソート
            return sessions.sort((a, b) => {
              const aTime = a.startedAt?.getTime() || 0;
              const bTime = b.startedAt?.getTime() || 0;
              return bTime - aTime;
            });
          } catch (retryError) {
            console.error('Error fetching sessions:', retryError);
            return [];
          }
        }
        console.error('Error fetching sessions:', error);
        return [];
      }
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
    queryKey: ['activeSession', userId],
    queryFn: async () => {
      if (!userId || !db) return null;
      const allSessions: any[] = [];

      // すべてのプロジェクトタイプからアクティブセッションを取得
      for (const projectType of PROJECT_TYPES) {
        const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');
        const q = query(
          sessionsRef,
          where('userId', '==', userId),
          where('endedAt', '==', null)
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((docItem) => {
          allSessions.push({
            id: docItem.id,
            projectType,
            taskId: docItem.data().taskId,
            ...docItem.data(),
          });
        });
      }

      if (allSessions.length > 0) {
        const session = allSessions[0];
        const activeSession = {
          projectType: session.projectType,
          taskId: session.taskId,
          sessionId: session.id,
        };
        onActiveSessionChange?.(activeSession);
        return session;
      } else {
        onActiveSessionChange?.(null);
        return null;
      }
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
      queryClient.invalidateQueries({ queryKey: ['taskSessions', variables.sessionData.taskId] });
      queryClient.invalidateQueries({ queryKey: ['sessionHistory', variables.sessionData.taskId] });
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
    onSuccess: () => {
      // taskIdを取得する必要があるが、updatesに含まれていない場合は既存セッションから取得
      // ここでは簡略化のため、taskSessionsクエリを無効化
      queryClient.invalidateQueries({ queryKey: ['taskSessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessionHistory'] });
    },
  });
}

/**
 * セッションを削除するmutation
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectType,
      sessionId,
    }: {
      projectType: string;
      sessionId: string;
    }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const sessionRef = doc(db, 'projects', projectType, 'taskSessions', sessionId);
      await deleteDoc(sessionRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskSessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessionHistory'] });
    },
  });
}

