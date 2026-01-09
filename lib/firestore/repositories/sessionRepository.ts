import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PROJECT_TYPES } from '@/constants/projectTypes';
import { TaskSession } from '@/types';
import { mapSessionDoc } from '@/lib/firestore/mappers/sessionMapper';

export interface ActiveSessionInfo {
  session: TaskSession;
  projectType: string;
  sessionId: string;
}

/**
 * 指定されたプロジェクト・タスクのセッション履歴を取得する
 * @param projectType プロジェクトタイプ
 * @param taskId タスクID
 * @returns セッション履歴のリスト
 */
export async function fetchTaskSessions(
  projectType: string,
  taskId: string
): Promise<TaskSession[]> {
  if (!projectType || !db || !taskId) return [];

  try {
    const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');
    const q = query(sessionsRef, where('taskId', '==', taskId), orderBy('startedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docItem) => mapSessionDoc(docItem.id, docItem.data()));
  } catch (error: unknown) {
    const isIndexError =
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'failed-precondition') ||
      (error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.includes('index'));
    if (isIndexError) {
      try {
        const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');
        const q = query(sessionsRef, where('taskId', '==', taskId));
        const snapshot = await getDocs(q);
        const sessions = snapshot.docs.map((docItem) => mapSessionDoc(docItem.id, docItem.data()));
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
}

/**
 * 指定されたユーザーのアクティブなセッション（未終了）を全プロジェクトから取得する
 * @param userId ユーザーID
 * @returns アクティブなセッション情報のリスト
 */
export async function fetchActiveSessionsByUser(userId: string): Promise<ActiveSessionInfo[]> {
  if (!userId || !db) return [];

  const allSessions: ActiveSessionInfo[] = [];

  for (const projectType of PROJECT_TYPES) {
    try {
      const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');
      const q = query(sessionsRef, where('userId', '==', userId), where('endedAt', '==', null));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((docItem) => {
        const session = mapSessionDoc(docItem.id, docItem.data());
        allSessions.push({
          session,
          projectType,
          sessionId: docItem.id,
        });
      });
    } catch (error) {
      console.error(`Error fetching active sessions for project ${projectType}:`, error);
      // 他のプロジェクトタイプの取得を続行
    }
  }

  return allSessions.sort((a, b) => {
    const aTime = a.session.startedAt?.getTime() ?? 0;
    const bTime = b.session.startedAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

/**
 * 指定されたタスクに対するユーザーのアクティブセッション（未終了）を取得する
 * @param params パラメータオブジェクト
 * @param params.projectType プロジェクトタイプ
 * @param params.taskId タスクID
 * @param params.userId ユーザーID
 * @returns アクティブセッション情報、または見つからない場合はnull
 */
export async function fetchActiveSessionForTask(params: {
  projectType: string;
  taskId: string;
  userId: string;
}): Promise<ActiveSessionInfo | null> {
  if (!db || !params.projectType || !params.taskId || !params.userId) return null;

  const sessionsRef = collection(db, 'projects', params.projectType, 'taskSessions');
  try {
    const q = query(
      sessionsRef,
      where('taskId', '==', params.taskId),
      where('userId', '==', params.userId),
      where('endedAt', '==', null)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const sessionDoc = snapshot.docs[0];
      const session = mapSessionDoc(sessionDoc.id, sessionDoc.data());
      return {
        session,
        projectType: params.projectType,
        sessionId: sessionDoc.id,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching active session for task:', error);
    return null;
  }
}
