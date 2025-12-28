import { Contact } from '@/types';
import { toNullableDate } from '@/lib/firestore/mappers/date';

export function mapContactDoc(docId: string, data: Record<string, unknown>): Contact {
  return {
    id: docId,
    ...(data as Omit<Contact, 'id'>),
    createdAt: toNullableDate((data as { createdAt?: unknown }).createdAt) ?? new Date(),
    updatedAt: toNullableDate((data as { updatedAt?: unknown }).updatedAt) ?? new Date(),
  };
}
