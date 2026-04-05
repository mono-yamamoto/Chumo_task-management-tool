import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';
import type { TaskSession } from '../types';

interface ActiveSessionsResponse {
  sessions: TaskSession[];
}

interface SessionsResponse {
  sessions: TaskSession[];
}

const ACTIVE_SESSION_KEY = 'chumo_active_session';

interface StoredActiveSession {
  sessionId: string;
  taskId: string;
  projectType: string;
  startedAt: string;
}

function readCachedSession(): StoredActiveSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/**
 * アクティブセッション（稼働中タイマー）を取得
 * GET /api/sessions/active + localStorage 永続化
 *
 * API レスポンス前は localStorage キャッシュを初期値として返す（リロード対応）
 */
export function useActiveSession() {
  const { getToken, isSignedIn } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.activeSession(),
    queryFn: async () => {
      const res = await apiClient<ActiveSessionsResponse>('/api/sessions/active', { getToken });
      const session = res.sessions[0] ?? null;

      if (session) {
        localStorage.setItem(
          ACTIVE_SESSION_KEY,
          JSON.stringify({
            sessionId: session.id,
            taskId: session.taskId,
            projectType: session.projectType ?? '',
            startedAt: session.startedAt,
          })
        );
      } else {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }

      return session;
    },
    enabled: isSignedIn,
    staleTime: 1000 * 10,
  });

  const cached = useMemo(readCachedSession, []);

  return { ...query, cached };
}

/**
 * タイマー開始/停止 mutation
 */
export function useTimer() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const start = useMutation({
    mutationFn: ({ taskId, projectType }: { taskId: string; projectType: string }) =>
      apiClient<{ success: boolean; sessionId: string }>('/api/timer/start', {
        method: 'POST',
        body: { taskId, projectType },
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSession() });
    },
  });

  const stop = useMutation({
    mutationFn: ({ sessionId, projectType }: { sessionId: string; projectType: string }) =>
      apiClient<{ success: boolean; durationSec: number }>('/api/timer/stop', {
        method: 'POST',
        body: { sessionId, projectType },
        getToken,
      }),
    onSuccess: () => {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return { start, stop };
}

/**
 * タスクのセッション一覧を取得
 * GET /api/sessions?taskId=xxx&projectType=xxx
 */
export function useTaskSessions(taskId: string | null, projectType: string | null) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.sessions(taskId ?? ''),
    queryFn: () =>
      apiClient<SessionsResponse>(`/api/sessions?taskId=${taskId}&projectType=${projectType}`, {
        getToken,
      }).then((res) => res.sessions),
    enabled: isSignedIn && taskId != null && projectType != null,
  });
}

/**
 * 経過時間のリアルタイム計算
 */
export function useElapsedTime(startedAt: string | Date | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }

    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return { elapsed, formatted: formatElapsed(elapsed) };
}
