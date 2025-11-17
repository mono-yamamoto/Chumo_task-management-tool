// import { Timestamp } from 'firebase/firestore';
import { TaskSession } from '@/types';

export function calculateTotalDuration(sessions: TaskSession[]): number {
  return sessions.reduce((total, session) => {
    if (session.endedAt) {
      return total + session.durationSec;
    }
    // 実行中のセッションは現在時刻まで
    const now = new Date();
    const start = session.startedAt;
    const duration = Math.floor((now.getTime() - start.getTime()) / 1000);
    return total + duration;
  }, 0);
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSecs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}時間${minutes}分${remainingSecs}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分${remainingSecs}秒`;
  }
  return `${remainingSecs}秒`;
}

export function hasActiveSession(sessions: TaskSession[]): boolean {
  return sessions.some((session) => session.endedAt === null);
}

