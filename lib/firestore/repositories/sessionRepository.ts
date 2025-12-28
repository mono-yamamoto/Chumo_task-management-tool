import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PROJECT_TYPES } from '@/constants/projectTypes';
import { TaskSession } from '@/types';
import { mapSessionDoc } from '@/lib/firestore/mappers/sessionMapper';

export interface ActiveSessionInfo {
  session: TaskSession;
  projectType: string;
  sessionId: string;
}

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
  } catch (error: any) {
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
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

export async function fetchActiveSessionsByUser(userId: string): Promise<ActiveSessionInfo[]> {
  if (!userId || !db) return [];

  const allSessions: ActiveSessionInfo[] = [];

  for (const projectType of PROJECT_TYPES) {
    const sessionsRef = collection(db, 'projects', projectType, 'taskSessions');
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      where('endedAt', '==', null)
    );
    const snapshot = await getDocs(q);
    snapshot.docs.forEach((docItem) => {
      const session = mapSessionDoc(docItem.id, docItem.data());
      allSessions.push({
        session,
        projectType,
        sessionId: docItem.id,
      });
    });
  }

  return allSessions;
}

export async function fetchActiveSessionForTask(params: {
  projectType: string;
  taskId: string;
  userId: string;
}): Promise<ActiveSessionInfo | null> {
  if (!db) return null;

  const sessionsRef = collection(db, 'projects', params.projectType, 'taskSessions');
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
}
