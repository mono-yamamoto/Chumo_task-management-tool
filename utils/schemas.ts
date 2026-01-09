import { z } from 'zod';
import { PROJECT_TYPES } from '@/constants/projectTypes';

export const flowStatusSchema = z.enum([
  '未着手',
  'ディレクション',
  'コーディング',
  'デザイン',
  '待ち',
  '対応中',
  '週次報告',
  '月次報告',
  '完了',
]);

export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const userRoleSchema = z.enum(['admin', 'member']);

export const userSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: userRoleSchema,
  isAllowed: z.boolean(),
  githubUsername: z.string().optional(),
  chatId: z.string().optional(), // Google ChatのユーザーID（メンション用）
});

export const projectSchema = z.object({
  name: z.string().min(1),
  ownerId: z.string(),
  memberIds: z.array(z.string()),
  backlogProjectKey: z.string().optional(),
  driveParentId: z.string().optional(),
});

export const labelSchema = z.object({
  name: z.string().min(1),
  color: z.string(),
  projectId: z.string().nullable(), // nullの場合は全プロジェクト共通の区分ラベル
});

export const taskExternalSchema = z.object({
  source: z.literal('backlog'),
  issueId: z.string(),
  issueKey: z.string(),
  url: z.string().url(),
  lastSyncedAt: z.date(),
  syncStatus: z.enum(['ok', 'failed']),
});

export const projectTypeSchema = z.enum([...PROJECT_TYPES] as [string, ...string[]]);

export const taskSchema = z.object({
  projectType: projectTypeSchema, // プロジェクトタイプ（固定値）
  external: taskExternalSchema.optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  flowStatus: flowStatusSchema,
  assigneeIds: z.array(z.string()),
  itUpDate: z.date().nullable(),
  releaseDate: z.date().nullable(),
  kubunLabelId: z.string(),
  googleDriveUrl: z.string().url().nullable().optional(),
  fireIssueUrl: z.string().url().nullable().optional(),
  googleChatThreadUrl: z.string().url().nullable().optional(),
  backlogUrl: z.string().url().nullable().optional(),
  dueDate: z.date().nullable().optional(),
  priority: prioritySchema.nullable().optional(),
  order: z.number(),
  over3Reason: z.string().optional(),
  createdBy: z.string(),
});

export const taskUpdateSchema = taskSchema.partial().extend({
  id: z.string(),
});

export const taskSessionSchema = z.object({
  taskId: z.string(),
  userId: z.string(),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  durationSec: z.number(),
  note: z.string().optional(),
});

export const timerStartSchema = z.object({
  taskId: z.string(),
  userId: z.string(),
});

export const timerStopSchema = z.object({
  sessionId: z.string(),
});

export const reportFilterSchema = z.object({
  from: z.date(),
  to: z.date(),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  taskId: z.string().optional(),
  type: z.enum(['normal', 'brg']).optional(),
});
