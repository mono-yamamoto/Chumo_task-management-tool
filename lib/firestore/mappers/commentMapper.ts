import { TaskComment } from '@/types';
import { toDate } from '@/lib/firestore/mappers/date';

export function mapCommentDoc(docId: string, data: Record<string, unknown>): TaskComment {
  const rawReadBy = (data as { readBy?: unknown }).readBy;
  const readBy = Array.isArray(rawReadBy)
    ? rawReadBy.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    id: docId,
    taskId: String((data as { taskId?: unknown }).taskId ?? ''),
    authorId: String((data as { authorId?: unknown }).authorId ?? ''),
    content: String((data as { content?: unknown }).content ?? ''),
    readBy,
    createdAt: toDate((data as { createdAt?: unknown }).createdAt),
    updatedAt: toDate((data as { updatedAt?: unknown }).updatedAt),
  };
}
