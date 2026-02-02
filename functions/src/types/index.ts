/**
 * Cloud Functions用の共通型定義
 */

import { Timestamp } from 'firebase-admin/firestore';

// Firestoreドキュメントの基本型
export interface FirestoreTimestamp {
  toDate(): Date;
  toMillis(): number;
}

// 日付フィールドの型（FirestoreではTimestampとして保存される）
export type DateField = Date | Timestamp | FirestoreTimestamp | null;

// タスクの外部連携情報
export interface TaskExternal {
  source: 'backlog';
  issueId: string;
  issueKey: string;
  url: string;
  lastSyncedAt: DateField;
  syncStatus: 'ok' | 'failed';
}

// タスクドキュメントの型
export interface TaskDocument {
  id?: string;
  projectType: string;
  external?: TaskExternal;
  title: string;
  description?: string;
  flowStatus: string;
  progressStatus?: string | null;
  assigneeIds: string[];
  itUpDate: DateField;
  releaseDate: DateField;
  kubunLabelId: string;
  googleDriveUrl?: string | null;
  fireIssueUrl?: string | null;
  googleChatThreadUrl?: string | null;
  backlogUrl?: string | null;
  dueDate?: DateField;
  priority?: string | null;
  order: number;
  over3Reason?: string;
  createdBy: string;
  createdAt: DateField;
  updatedAt: DateField;
  completedAt?: DateField;
}

// ユーザードキュメントの型
export interface UserDocument {
  id?: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member';
  isAllowed: boolean;
  githubUsername?: string;
  googleRefreshToken?: string;
  googleOAuthUpdatedAt?: DateField;
  chatId?: string;
  fcmTokens?: string[];
  createdAt: DateField;
  updatedAt: DateField;
}

// プロジェクトドキュメントの型
export interface ProjectDocument {
  id?: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  backlogProjectKey?: string;
  driveParentId?: string;
  createdAt: DateField;
  updatedAt: DateField;
}

// タスクセッションドキュメントの型
export interface TaskSessionDocument {
  id?: string;
  taskId: string;
  userId: string;
  startedAt: DateField;
  endedAt: DateField;
  durationSec: number;
  note?: string;
}

// コメントドキュメントの型
export interface TaskCommentDocument {
  id?: string;
  taskId: string;
  authorId: string;
  content: string;
  mentionedUserIds?: string[];
  readBy: string[];
  createdAt: DateField;
  updatedAt: DateField;
}

// お問い合わせドキュメントの型
export interface ContactDocument {
  id?: string;
  type: 'error' | 'feature' | 'other';
  title: string;
  content: string;
  userId: string;
  userName: string;
  userEmail: string;
  errorReportDetails?: ErrorReportDetails;
  githubIssueUrl?: string;
  status: 'pending' | 'resolved';
  createdAt: DateField;
  updatedAt: DateField;
}

export interface ErrorReportDetails {
  issue: string;
  reproductionSteps: string;
  environment: {
    device: 'PC' | 'SP';
    os: string;
    browser: string;
    osVersion?: string;
    browserVersion: string;
  };
  screenshotUrl?: string;
}

// リクエストボディの型
// CreateGoogleChatThreadRequestBody: パスパラメータから取得するため不要
// GithubCreateRequestBody: パスパラメータから取得するため不要

export interface ContactCreateIssueRequestBody {
  contactId?: string;
}

export interface DriveCreateRequestBody {
  userId: string;
}

export interface TimerRequestBody {
  userId?: string;
  taskId?: string;
  sessionId?: string;
}

// Backlog Webhook関連の型
export interface BacklogWebhookPayload {
  id: number;
  project: {
    id: number;
    projectKey: string;
    name: string;
  };
  type: number;
  content: BacklogWebhookContent;
  createdUser: {
    id: number;
    userId: string;
    name: string;
    roleType: number;
    lang: string | null;
    mailAddress: string;
  };
  created: string;
}

export interface BacklogWebhookContent {
  id: number;
  key_id: number;
  summary: string;
  description: string;
  issueType: {
    id: number;
    projectId: number;
    name: string;
    color: string;
    displayOrder: number;
  };
  status: {
    id: number;
    projectId: number;
    name: string;
    color: string;
    displayOrder: number;
  };
  assignee?: {
    id: number;
    userId: string;
    name: string;
    roleType: number;
    lang: string | null;
    mailAddress: string;
  };
  priority: {
    id: number;
    name: string;
  };
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  parentIssueId?: number | null;
  customFields?: BacklogCustomField[];
  changes?: BacklogChange[];
}

export interface BacklogCustomField {
  id: number;
  fieldTypeId: number;
  name: string;
  value?: string | number | { id: number; name: string } | null;
}

export interface BacklogChange {
  field: string;
  new_value?: string;
  old_value?: string;
  type?: string;
}

// 汎用的なFirestoreドキュメント型
export type FirestoreDocument<T> = T & {
  id: string;
};
