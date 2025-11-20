// import { User as FirebaseUser } from 'firebase/auth';
// import { Timestamp } from 'firebase/firestore';

import { ProjectType } from '@/constants/projectTypes';

export type UserRole = 'admin' | 'member';

export type FlowStatus =
  | '未着手'
  | 'ディレクション'
  | 'コーディング'
  | 'デザイン'
  | '待ち'
  | '対応中'
  | '週次報告'
  | '月次報告'
  | '完了';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isAllowed: boolean;
  githubUsername?: string;
  googleRefreshToken?: string;
  googleOAuthUpdatedAt?: Date;
  chatId?: string; // Google ChatのユーザーID（メンション用）
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  backlogProjectKey?: string;
  driveParentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string | null; // nullの場合は全プロジェクト共通の区分ラベル
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskExternal {
  source: 'backlog';
  issueId: string;
  issueKey: string;
  url: string;
  lastSyncedAt: Date;
  syncStatus: 'ok' | 'failed';
}

export interface Task {
  id: string;
  projectType: ProjectType; // プロジェクトタイプ（固定値）
  external?: TaskExternal;
  title: string;
  description?: string;
  flowStatus: FlowStatus;
  assigneeIds: string[];
  itUpDate: Date | null;
  releaseDate: Date | null;
  kubunLabelId: string;
  googleDriveUrl?: string | null;
  fireIssueUrl?: string | null;
  googleChatThreadUrl?: string | null;
  backlogUrl?: string | null; // 手動入力用のバックログURL
  dueDate?: Date | null;
  priority?: Priority | null;
  order: number;
  over3Reason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export interface TaskSession {
  id: string;
  taskId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSec: number;
  note?: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  type: 'sync' | 'timerStart' | 'timerStop' | 'update' | 'driveCreate' | 'fireCreate';
  actorId: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

export type ContactType = 'error' | 'feature' | 'other';

export type DeviceType = 'PC' | 'SP';
export type PCOSType = 'Mac' | 'Windows' | 'Linux' | 'other';
export type SPOSType = 'iOS' | 'Android' | 'other';
export type BrowserType = 'Chrome' | 'Firefox' | 'Safari' | 'Arc' | 'Comet' | 'Dia' | 'other';
export type SmartphoneType = 'iPhone' | 'Android' | 'other';

export interface ErrorReportDetails {
  issue: string; // 事象
  reproductionSteps: string; // 再現方法
  environment: {
    device: DeviceType; // PC/SP
    os: PCOSType | SPOSType | SmartphoneType; // OS（PC選択時）またはスマホの種類（SP選択時）
    browser: BrowserType; // ブラウザ
    osVersion?: string; // OSのバージョン（PC選択時）またはスマホのバージョン（SP選択時必須）
    browserVersion: string; // ブラウザのバージョン（必須）
  };
  screenshotUrl?: string; // 再現画面のスクリーンショットURL
}

export interface Contact {
  id: string;
  type: ContactType;
  title: string;
  content: string;
  userId: string;
  userName: string;
  userEmail: string;
  errorReportDetails?: ErrorReportDetails; // エラー報告の場合の詳細情報
  githubIssueUrl?: string;
  status: 'pending' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}
