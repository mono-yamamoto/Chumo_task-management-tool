import { TaskSession } from '@/types';
import { toNullableDate } from '@/lib/firestore/mappers/date';

export function mapSessionDoc(docId: string, data: Record<string, unknown>): TaskSession {
  return {
    id: docId,
    taskId: String((data as { taskId?: unknown }).taskId ?? ''),
    userId: String((data as { userId?: unknown }).userId ?? ''),
    startedAt: toNullableDate((data as { startedAt?: unknown }).startedAt) ?? new Date(),
    endedAt: toNullableDate((data as { endedAt?: unknown }).endedAt),
    durationSec: Number((data as { durationSec?: unknown }).durationSec ?? 0),
    note: (data as { note?: unknown }).note as string | undefined,
  };
}
