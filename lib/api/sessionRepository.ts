import { apiClient } from '@/lib/http/apiClient';
import { TaskSession } from '@/types';
import { parseDate, parseDateRequired } from './dateUtils';

type GetToken = () => Promise<string | null>;

type SessionRaw = Omit<TaskSession, 'startedAt' | 'endedAt'> & {
  startedAt: string;
  endedAt: string | null;
  projectType?: string;
};

function mapSession(raw: SessionRaw): TaskSession {
  return {
    id: raw.id,
    taskId: raw.taskId,
    userId: raw.userId,
    startedAt: parseDateRequired(raw.startedAt),
    endedAt: parseDate(raw.endedAt),
    durationSec: raw.durationSec,
    note: raw.note,
  };
}

export interface ActiveSessionInfo {
  session: TaskSession;
  projectType: string;
  sessionId: string;
}

export async function fetchTaskSessions(
  projectType: string,
  taskId: string,
  getToken: GetToken
): Promise<TaskSession[]> {
  const data = await apiClient<{ sessions: SessionRaw[] }>(
    `/api/sessions?taskId=${taskId}&projectType=${projectType}`,
    { getToken }
  );
  return data.sessions.map(mapSession);
}

export async function fetchActiveSessionsByUser(
  userId: string,
  getToken: GetToken
): Promise<ActiveSessionInfo[]> {
  const data = await apiClient<{ sessions: SessionRaw[] }>(
    `/api/sessions/active?userId=${userId}`,
    { getToken }
  );
  return data.sessions.map((raw) => ({
    session: mapSession(raw),
    projectType: raw.projectType ?? '',
    sessionId: raw.id,
  }));
}

export async function fetchActiveSessionForTask(
  params: {
    projectType: string;
    taskId: string;
    userId: string;
  },
  getToken: GetToken
): Promise<ActiveSessionInfo | null> {
  const data = await apiClient<{ sessions: SessionRaw[] }>(
    `/api/sessions/active?userId=${params.userId}`,
    { getToken }
  );
  const match = data.sessions.find(
    (s) => s.taskId === params.taskId && s.projectType === params.projectType
  );
  if (!match) return null;
  return {
    session: mapSession(match),
    projectType: params.projectType,
    sessionId: match.id,
  };
}

export async function addSession(
  params: {
    projectType: string;
    sessionData: {
      taskId: string;
      userId: string;
      startedAt: Date;
      endedAt: Date | null;
      note?: string | null;
    };
  },
  getToken: GetToken
): Promise<void> {
  await apiClient('/api/sessions', {
    method: 'POST',
    body: {
      taskId: params.sessionData.taskId,
      projectType: params.projectType,
      startedAt: params.sessionData.startedAt.toISOString(),
      endedAt: params.sessionData.endedAt?.toISOString() ?? null,
      note: params.sessionData.note ?? null,
    },
    getToken,
  });
}

export async function updateSession(
  params: {
    projectType: string;
    sessionId: string;
    updates: Partial<{
      startedAt: Date;
      endedAt: Date | null;
      userId: string;
      note: string | null;
    }>;
  },
  getToken: GetToken
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (params.updates.startedAt) body.startedAt = params.updates.startedAt.toISOString();
  if (params.updates.endedAt !== undefined) {
    body.endedAt = params.updates.endedAt?.toISOString() ?? null;
  }
  if (params.updates.userId) body.userId = params.updates.userId;
  if (params.updates.note !== undefined) body.note = params.updates.note;

  await apiClient(`/api/sessions/${params.sessionId}`, {
    method: 'PUT',
    body,
    getToken,
  });
}

export async function deleteSession(
  _projectType: string,
  sessionId: string,
  getToken: GetToken
): Promise<void> {
  await apiClient(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
    getToken,
  });
}
