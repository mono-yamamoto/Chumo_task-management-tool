import { Contact } from '@/types';
import { toNullableDate } from '@/lib/firestore/mappers/date';

export function mapContactDoc(docId: string, data: Record<string, unknown>): Contact {
  const type = data.type;
  const title = data.title;
  const content = data.content;
  const userId = data.userId;
  const userName = data.userName;
  const userEmail = data.userEmail;
  const status = data.status;
  const validTypes: ContactType[] = ['error', 'feature', 'other'];
  const validStatuses = ['pending', 'resolved'] as const;

  if (
    typeof type !== 'string' ||
    typeof title !== 'string' ||
    typeof content !== 'string' ||
    typeof userId !== 'string' ||
    typeof userName !== 'string' ||
    typeof userEmail !== 'string' ||
    typeof status !== 'string' ||
    !validTypes.includes(type as ContactType) ||
    !validStatuses.includes(status as Contact['status'])
  ) {
    throw new Error(`Invalid contact data: type=${type}, status=${status}`);
  }

  const githubIssueUrl = typeof data.githubIssueUrl === 'string' ? data.githubIssueUrl : undefined;
  const errorReportDetails =
    typeof data.errorReportDetails === 'object' && data.errorReportDetails !== null
      ? (data.errorReportDetails as Contact['errorReportDetails'])
      : undefined;

  return {
    id: docId,
    type: type as Contact['type'],
    title,
    content,
    userId,
    userName,
    userEmail,
    status: status as Contact['status'],
    errorReportDetails,
    githubIssueUrl,
    createdAt: toNullableDate((data as { createdAt?: unknown }).createdAt) ?? new Date(),
    updatedAt: toNullableDate((data as { updatedAt?: unknown }).updatedAt) ?? new Date(),
  };
}
