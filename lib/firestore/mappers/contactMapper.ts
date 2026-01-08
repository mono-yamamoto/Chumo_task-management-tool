import { Contact, ErrorReportDetails } from '@/types';
import { toNullableDate } from '@/lib/firestore/mappers/date';

import type { ContactType } from '@/types';

/**
 * ErrorReportDetailsオブジェクトの構造と必要なフィールドを検証する
 * @param data 検証対象のデータ
 * @returns 有効なErrorReportDetailsかどうか
 */
function validateErrorReportDetails(data: unknown): data is ErrorReportDetails {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // 必須フィールドの検証
  if (typeof obj.issue !== 'string' || typeof obj.reproductionSteps !== 'string') {
    return false;
  }

  // environment オブジェクトの検証
  if (typeof obj.environment !== 'object' || obj.environment === null) {
    return false;
  }

  const env = obj.environment as Record<string, unknown>;

  // environment の必須フィールド
  if (
    typeof env.device !== 'string' ||
    typeof env.os !== 'string' ||
    typeof env.browser !== 'string' ||
    typeof env.browserVersion !== 'string'
  ) {
    return false;
  }

  // osVersion は任意だが、存在する場合は文字列である必要がある
  if (env.osVersion !== undefined && typeof env.osVersion !== 'string') {
    return false;
  }

  // screenshotUrl は任意だが、存在する場合は文字列である必要がある
  if (obj.screenshotUrl !== undefined && typeof obj.screenshotUrl !== 'string') {
    return false;
  }

  return true;
}

/**
 * FirestoreドキュメントデータをContact型にマッピングする
 * @param docId ドキュメントID
 * @param data Firestoreドキュメントデータ
 * @returns Contact型のオブジェクト
 * @throws {Error} 必須フィールドが不正またはerrorReportDetailsの構造が不正な場合
 */
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

  // errorReportDetailsの検証を改善
  let errorReportDetails: Contact['errorReportDetails'] = undefined;
  if (data.errorReportDetails !== undefined && data.errorReportDetails !== null) {
    if (validateErrorReportDetails(data.errorReportDetails)) {
      errorReportDetails = data.errorReportDetails;
    } else {
      throw new Error('Invalid errorReportDetails structure');
    }
  }

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
