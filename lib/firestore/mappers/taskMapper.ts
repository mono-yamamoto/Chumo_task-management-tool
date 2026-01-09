import { Task } from '@/types';
import { ProjectType } from '@/constants/projectTypes';
import { toNullableDate } from '@/lib/firestore/mappers/date';

export function mapTaskDoc(
  docId: string,
  data: Record<string, unknown>,
  projectType: ProjectType
): Task & { projectType: ProjectType } {
  const readString = (value: unknown) => (typeof value === 'string' ? value : undefined);
  const readNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);
  const readStringArray = (value: unknown) =>
    Array.isArray(value) && value.every((item) => typeof item === 'string')
      ? (value as string[])
      : undefined;
  const readNullableString = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (value === null) return null;
    return undefined;
  };

  const title = readString(data.title);
  const flowStatus = readString(data.flowStatus);
  const assigneeIds = readStringArray(data.assigneeIds);
  const kubunLabelId = readString(data.kubunLabelId);
  const order = readNumber(data.order);
  const createdBy = readString(data.createdBy);

  if (
    !title ||
    !flowStatus ||
    !assigneeIds ||
    kubunLabelId === undefined ||
    order === undefined ||
    !createdBy
  ) {
    throw new Error('Invalid task data');
  }

  const description = readString(data.description);
  const external =
    typeof data.external === 'object' && data.external !== null
      ? (data.external as Task['external'])
      : undefined;
  const googleDriveUrl = readNullableString(data.googleDriveUrl);
  const fireIssueUrl = readNullableString(data.fireIssueUrl);
  const googleChatThreadUrl = readNullableString(data.googleChatThreadUrl);
  const backlogUrl = readNullableString(data.backlogUrl);
  const priority = data.priority === null ? null : readString(data.priority);
  const over3Reason = readString(data.over3Reason);

  return {
    id: docId,
    projectType,
    external,
    title,
    description,
    flowStatus: flowStatus as Task['flowStatus'],
    assigneeIds,
    itUpDate: toNullableDate((data as { itUpDate?: unknown }).itUpDate),
    releaseDate: toNullableDate((data as { releaseDate?: unknown }).releaseDate),
    kubunLabelId,
    googleDriveUrl,
    fireIssueUrl,
    googleChatThreadUrl,
    backlogUrl,
    dueDate: toNullableDate((data as { dueDate?: unknown }).dueDate),
    priority: priority as Task['priority'],
    order,
    over3Reason,
    createdBy,
    createdAt: toNullableDate((data as { createdAt?: unknown }).createdAt) ?? new Date(),
    updatedAt: toNullableDate((data as { updatedAt?: unknown }).updatedAt) ?? new Date(),
    completedAt: toNullableDate((data as { completedAt?: unknown }).completedAt),
  };
}
