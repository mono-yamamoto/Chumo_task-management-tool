/**
 * プロジェクトタイプの固定値
 */
export const PROJECT_TYPES = [
  'REG2017',
  'BRGREG',
  'MONO',
  'MONO_ADMIN',
  'DES_FIRE',
  'DesignSystem',
  'DMREG2',
  'monosus',
  'PRREG',
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

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

export type ProgressStatus =
  | '未着手'
  | '仕様確認'
  | '待ち'
  | '調査'
  | '見積'
  | 'CO'
  | 'ロック解除待ち'
  | 'デザイン'
  | 'コーディング'
  | '品管チェック'
  | 'IT連絡済み'
  | 'ST連絡済み'
  | 'SENJU登録'
  | '親課題';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isAllowed: boolean;
  githubUsername?: string;
  googleOAuthUpdatedAt?: Date;
  chatId?: string;
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
  projectId: string | null;
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
  projectType: ProjectType;
  external?: TaskExternal;
  title: string;
  description?: string;
  flowStatus: FlowStatus;
  progressStatus?: ProgressStatus | null;
  assigneeIds: string[];
  itUpDate: Date | null;
  releaseDate: Date | null;
  kubunLabelId: string;
  googleDriveUrl?: string | null;
  fireIssueUrl?: string | null;
  googleChatThreadUrl?: string | null;
  backlogUrl?: string | null;
  petIssueUrl?: string | null;
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
  projectType?: ProjectType;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSec: number;
  note?: string;
}

export interface ActiveSession {
  projectType: ProjectType;
  taskId: string;
  sessionId: string;
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
  issue: string;
  reproductionSteps: string;
  environment: {
    device: DeviceType;
    os: PCOSType | SPOSType | SmartphoneType;
    browser: BrowserType;
    osVersion?: string;
    browserVersion: string;
  };
  screenshotUrl?: string;
}

export interface Contact {
  id: string;
  type: ContactType;
  title: string;
  content: string;
  userId: string;
  userName: string;
  userEmail: string;
  errorReportDetails?: ErrorReportDetails;
  githubIssueUrl?: string;
  status: 'pending' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  mentionedUserIds?: string[];
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ReportType = 'normal' | 'brg';

export interface ReportEntry {
  id: string;
  taskId: string;
  title: string;
  type: ReportType;
  totalDurationSec: number;
  over3Reason?: string;
  sessions: TaskSession[];
  date: Date;
}
