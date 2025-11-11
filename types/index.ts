import { User as FirebaseUser } from "firebase/auth";
import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "member";

export type FlowStatus =
  | "未着手"
  | "ディレクション"
  | "コーディング"
  | "デザイン"
  | "待ち"
  | "対応中"
  | "週次報告"
  | "月次報告"
  | "完了";

export type Priority = "low" | "medium" | "high" | "urgent";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isAllowed: boolean;
  githubUsername?: string;
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
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskExternal {
  source: "backlog";
  issueId: string;
  issueKey: string;
  url: string;
  lastSyncedAt: Date;
  syncStatus: "ok" | "failed";
}

export interface Task {
  id: string;
  projectId: string;
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
  type: "sync" | "timerStart" | "timerStop" | "update" | "driveCreate" | "fireCreate";
  actorId: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

