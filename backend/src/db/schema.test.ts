import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createTestDb, cleanDatabase } from './test-helpers';
import * as schema from './schema';
import { projectTypeEnum } from './schema';

const { db, client } = createTestDb();

/**
 * ドリフト検知: frontend の PROJECT_TYPES は手動メンテのため、
 * DB enum (project_type) と値がズレていないかをここで保証する。
 * frontend↔backend は別パッケージで定数を共有できないため、ソースを読んで突き合わせる。
 */
describe('schema: project_type enum とフロントの同期', () => {
  it('frontend の PROJECT_TYPES が project_type enum と一致する', () => {
    const frontendTypesPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../frontend/src/types/index.ts'
    );
    const src = readFileSync(frontendTypesPath, 'utf-8');

    const block = src.match(/export const PROJECT_TYPES = \[([\s\S]*?)\] as const;/);
    expect(block, 'frontend に PROJECT_TYPES 定義が見つからない').not.toBeNull();

    const frontendValues = [...block![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

    // 値の集合が一致すること（表示順の差異は許容するため sort で比較）
    expect([...frontendValues].sort()).toEqual([...projectTypeEnum.enumValues].sort());
  });
});

afterEach(async () => {
  await cleanDatabase(db);
});

afterAll(async () => {
  await client.end();
});

describe('schema: users', () => {
  it('ユーザーを作成・取得できる', async () => {
    await db.insert(schema.users).values({
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'テストユーザー',
      role: 'member',
      isAllowed: true,
    });

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, 'user-1'));

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.displayName).toBe('テストユーザー');
    expect(user.role).toBe('member');
    expect(user.isAllowed).toBe(true);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('partner ロールを保存できる', async () => {
    await db.insert(schema.users).values({
      id: 'user-partner',
      email: 'partner@example.com',
      displayName: 'パートナーユーザー',
      role: 'partner',
      isAllowed: true,
    });

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, 'user-partner'));

    expect(user.role).toBe('partner');
  });

  it('fcmTokens 配列を保存できる', async () => {
    await db.insert(schema.users).values({
      id: 'user-2',
      email: 'fcm@example.com',
      displayName: 'FCMユーザー',
      fcmTokens: ['token-a', 'token-b'],
    });

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, 'user-2'));
    expect(user.fcmTokens).toEqual(['token-a', 'token-b']);
  });
});

describe('schema: tasks', () => {
  it('タスクを作成・取得できる', async () => {
    await db.insert(schema.users).values({
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'テスト',
    });

    await db.insert(schema.tasks).values({
      id: 'task-1',
      projectType: 'MONO',
      title: 'テストタスク',
      flowStatus: 'ディレクション',
      kubunLabelId: 'label-1',
      assigneeIds: ['user-1'],
      order: 1,
      createdBy: 'user-1',
    });

    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, 'task-1'));

    expect(task).toBeDefined();
    expect(task.title).toBe('テストタスク');
    expect(task.projectType).toBe('MONO');
    expect(task.flowStatus).toBe('ディレクション');
    expect(task.assigneeIds).toEqual(['user-1']);
    expect(task.order).toBe(1);
  });

  it('日本語ステータスをenumで保存できる', async () => {
    await db.insert(schema.tasks).values({
      id: 'task-2',
      projectType: 'BRGREG',
      title: '品管チェックタスク',
      flowStatus: '対応中',
      progressStatus: '品管チェック',
      kubunLabelId: 'label-1',
      order: 2,
      createdBy: 'user-x',
    });

    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, 'task-2'));
    expect(task.flowStatus).toBe('対応中');
    expect(task.progressStatus).toBe('品管チェック');
  });
});

describe('schema: task_sessions', () => {
  beforeAll(async () => {
    await db.insert(schema.tasks).values({
      id: 'task-s1',
      projectType: 'MONO',
      title: 'セッション用タスク',
      kubunLabelId: 'label-1',
      order: 1,
      createdBy: 'user-1',
    });
  });

  it('セッションを作成・取得できる', async () => {
    const now = new Date();
    const endedAt = new Date(now.getTime() + 3600000);

    await db.insert(schema.taskSessions).values({
      id: 'session-1',
      taskId: 'task-s1',
      projectType: 'MONO',
      userId: 'user-1',
      startedAt: now,
      endedAt,
      durationSec: 3600,
    });

    const [session] = await db
      .select()
      .from(schema.taskSessions)
      .where(eq(schema.taskSessions.id, 'session-1'));

    expect(session).toBeDefined();
    expect(session.durationSec).toBe(3600);
    expect(session.startedAt).toBeInstanceOf(Date);
    expect(session.endedAt).toBeInstanceOf(Date);
  });
});

describe('schema: task_comments', () => {
  beforeAll(async () => {
    await db.insert(schema.tasks).values({
      id: 'task-c1',
      projectType: 'MONO',
      title: 'コメント用タスク',
      kubunLabelId: 'label-1',
      order: 1,
      createdBy: 'user-1',
    });
  });

  it('コメントを作成しreadBy配列を更新できる', async () => {
    await db.insert(schema.taskComments).values({
      id: 'comment-1',
      taskId: 'task-c1',
      projectType: 'MONO',
      authorId: 'user-1',
      content: '<p>テストコメント</p>',
      mentionedUserIds: ['user-2'],
      readBy: ['user-1'],
    });

    const [comment] = await db
      .select()
      .from(schema.taskComments)
      .where(eq(schema.taskComments.id, 'comment-1'));

    expect(comment.content).toBe('<p>テストコメント</p>');
    expect(comment.mentionedUserIds).toEqual(['user-2']);
    expect(comment.readBy).toEqual(['user-1']);
  });
});

describe('schema: task_externals (cascade delete)', () => {
  it('タスク削除時にexternalも連鎖削除される', async () => {
    await db.insert(schema.tasks).values({
      id: 'task-del',
      projectType: 'MONO',
      title: '削除テスト',
      kubunLabelId: 'label-1',
      order: 1,
      createdBy: 'user-1',
    });

    await db.insert(schema.taskExternals).values({
      id: 'ext-1',
      taskId: 'task-del',
      source: 'backlog',
      issueId: 'ISSUE-1',
      issueKey: 'MONO-1',
      url: 'https://backlog.example.com/MONO-1',
      lastSyncedAt: new Date(),
    });

    await db.delete(schema.tasks).where(eq(schema.tasks.id, 'task-del'));

    const externals = await db
      .select()
      .from(schema.taskExternals)
      .where(eq(schema.taskExternals.taskId, 'task-del'));

    expect(externals).toHaveLength(0);
  });
});

describe('schema: contacts', () => {
  it('エラー報告をJSONBで保存できる', async () => {
    const errorDetails = {
      issue: '画面が真っ白になる',
      reproductionSteps: 'ログイン後にダッシュボードを開く',
      environment: {
        device: 'PC',
        os: 'Mac',
        browser: 'Chrome',
        browserVersion: '120.0',
      },
    };

    await db.insert(schema.contacts).values({
      id: 'contact-1',
      type: 'error',
      title: 'バグ報告',
      content: '詳細はerrorReportDetailsを参照',
      userId: 'user-1',
      userName: 'テスト',
      userEmail: 'test@example.com',
      errorReportDetails: errorDetails,
    });

    const [contact] = await db
      .select()
      .from(schema.contacts)
      .where(eq(schema.contacts.id, 'contact-1'));

    expect(contact.errorReportDetails).toEqual(errorDetails);
    expect(contact.status).toBe('pending');
  });
});
