import { Task } from '@/types';
import { ProjectType } from '@/constants/projectTypes';
import { toNullableDate } from '@/lib/firestore/mappers/date';

export function mapTaskDoc(
  docId: string,
  data: Record<string, unknown>,
  projectType: ProjectType
): Task & { projectType: ProjectType } {
  return {
    id: docId,
    projectType,
    ...(data as Omit<Task, 'id' | 'projectType'>),
    createdAt: toNullableDate((data as { createdAt?: unknown }).createdAt) ?? new Date(),
    updatedAt: toNullableDate((data as { updatedAt?: unknown }).updatedAt) ?? new Date(),
    itUpDate: toNullableDate((data as { itUpDate?: unknown }).itUpDate),
    releaseDate: toNullableDate((data as { releaseDate?: unknown }).releaseDate),
    dueDate: toNullableDate((data as { dueDate?: unknown }).dueDate),
    completedAt: toNullableDate((data as { completedAt?: unknown }).completedAt),
  };
}
