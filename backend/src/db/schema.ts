import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- Enums ---

export const userRoleEnum = pgEnum('user_role', ['admin', 'member']);

export const flowStatusEnum = pgEnum('flow_status', [
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

export const progressStatusEnum = pgEnum('progress_status', [
  '未着手',
  '仕様確認',
  '待ち',
  '調査',
  '見積',
  'CO',
  'ロック解除待ち',
  'デザイン',
  'コーディング',
  '品管チェック',
  'IT連絡済み',
  'ST連絡済み',
  'SENJU登録',
  '親課題',
]);

export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'urgent']);

export const projectTypeEnum = pgEnum('project_type', [
  'REG2017',
  'BRGREG',
  'MONO',
  'MONO_ADMIN',
  'DES_FIRE',
  'DesignSystem',
  'DMREG2',
  'monosus',
  'PRREG',
]);

export const contactTypeEnum = pgEnum('contact_type', ['error', 'feature', 'other']);

export const contactStatusEnum = pgEnum('contact_status', ['pending', 'resolved']);

export const activityTypeEnum = pgEnum('activity_type', [
  'sync',
  'timerStart',
  'timerStop',
  'update',
  'driveCreate',
  'fireCreate',
]);

export const externalSourceEnum = pgEnum('external_source', ['backlog']);

export const syncStatusEnum = pgEnum('sync_status', ['ok', 'failed']);

// --- Tables ---

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  role: userRoleEnum('role').notNull().default('member'),
  isAllowed: boolean('is_allowed').notNull().default(false),
  githubUsername: text('github_username'),
  googleRefreshToken: text('google_refresh_token'),
  googleOAuthUpdatedAt: timestamp('google_oauth_updated_at', { withTimezone: true }),
  chatId: text('chat_id'),
  fcmTokens: text('fcm_tokens').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(),
  memberIds: text('member_ids').array().notNull().default([]),
  backlogProjectKey: text('backlog_project_key'),
  driveParentId: text('drive_parent_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const labels = pgTable('labels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  projectId: text('project_id'),
  ownerId: text('owner_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    projectType: projectTypeEnum('project_type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    flowStatus: flowStatusEnum('flow_status').notNull().default('未着手'),
    progressStatus: progressStatusEnum('progress_status'),
    assigneeIds: text('assignee_ids').array().notNull().default([]),
    itUpDate: timestamp('it_up_date', { withTimezone: true }),
    releaseDate: timestamp('release_date', { withTimezone: true }),
    kubunLabelId: text('kubun_label_id').notNull(),
    googleDriveUrl: text('google_drive_url'),
    fireIssueUrl: text('fire_issue_url'),
    googleChatThreadUrl: text('google_chat_thread_url'),
    backlogUrl: text('backlog_url'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    priority: priorityEnum('priority'),
    order: real('order').notNull().default(0),
    over3Reason: text('over3_reason'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('tasks_project_type_idx').on(table.projectType),
    index('tasks_flow_status_idx').on(table.flowStatus),
    index('tasks_assignee_ids_idx').on(table.assigneeIds),
    index('tasks_order_idx').on(table.order),
    index('tasks_project_type_flow_status_idx').on(table.projectType, table.flowStatus),
  ]
);

export const taskExternals = pgTable('task_externals', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .unique()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  source: externalSourceEnum('source').notNull(),
  issueId: text('issue_id').notNull(),
  issueKey: text('issue_key').notNull(),
  url: text('url').notNull(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull(),
  syncStatus: syncStatusEnum('sync_status').notNull().default('ok'),
});

export const taskSessions = pgTable(
  'task_sessions',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    projectType: projectTypeEnum('project_type').notNull(),
    userId: text('user_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationSec: integer('duration_sec').notNull().default(0),
    note: text('note'),
  },
  (table) => [
    index('task_sessions_task_id_idx').on(table.taskId),
    index('task_sessions_user_id_idx').on(table.userId),
    index('task_sessions_ended_at_idx').on(table.endedAt),
    uniqueIndex('task_sessions_user_active_idx')
      .on(table.userId)
      .where(sql`${table.endedAt} is null`),
  ]
);

export const taskComments = pgTable(
  'task_comments',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    projectType: projectTypeEnum('project_type').notNull(),
    authorId: text('author_id').notNull(),
    content: text('content').notNull(),
    mentionedUserIds: text('mentioned_user_ids').array().default([]),
    readBy: text('read_by').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('task_comments_task_id_idx').on(table.taskId),
    index('task_comments_author_id_idx').on(table.authorId),
  ]
);

export const taskActivities = pgTable(
  'task_activities',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    projectType: projectTypeEnum('project_type').notNull(),
    type: activityTypeEnum('type').notNull(),
    actorId: text('actor_id').notNull(),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('task_activities_task_id_idx').on(table.taskId)]
);

export const contacts = pgTable('contacts', {
  id: text('id').primaryKey(),
  type: contactTypeEnum('type').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  errorReportDetails: jsonb('error_report_details'),
  githubIssueUrl: text('github_issue_url'),
  status: contactStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
