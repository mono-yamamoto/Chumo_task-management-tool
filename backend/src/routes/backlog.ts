import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { tasks, taskExternals } from '../db/schema';
import { generateId } from '../lib/id';
import {
  extractIssueFromPayload,
  extractProjectTypeFromIssueKey,
  generateBacklogUrl,
  getCustomFieldConfig,
  getCustomFieldValue,
  parseDateString,
} from '../lib/backlog';
import type { BacklogWebhookPayload } from '../lib/backlog';
import type { Env } from '../index';
import type { Database } from '../db';

type BacklogEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<BacklogEnv>();

// --- POST /webhook ---

app.post('/webhook', async (c) => {
  const ua = c.req.header('User-Agent') ?? '';
  const hasSecretHeader = Boolean(c.req.header('X-Backlog-Webhook-Secret'));
  const hasSecretQuery = Boolean(c.req.query('secret'));
  console.info('[backlog/webhook] received', { ua, hasSecretHeader, hasSecretQuery });

  // Webhook認証: 共有シークレットで検証
  const secret = c.req.header('X-Backlog-Webhook-Secret') ?? c.req.query('secret');
  if (!secret || secret !== c.env.BACKLOG_WEBHOOK_SECRET) {
    console.warn('[backlog/webhook] rejected: invalid secret', {
      hasSecretHeader,
      hasSecretQuery,
    });
    return c.json({ error: 'Invalid webhook secret' }, 401);
  }

  const db = c.get('db');
  const body = (await c.req.json()) as BacklogWebhookPayload;

  // ペイロードから課題情報を抽出
  const { issueKey, issueId, title, description, customFields } = extractIssueFromPayload(body);
  console.info('[backlog/webhook] parsed', {
    issueKey,
    issueId,
    hasTitle: Boolean(title),
    hasDescription: description !== undefined,
    customFieldsCount: customFields?.length ?? 0,
  });

  if (!issueKey) {
    console.warn('[backlog/webhook] rejected: missing issueKey');
    return c.json({ error: 'Missing issueKey in webhook payload' }, 400);
  }

  // 課題番号からプロジェクトタイプを抽出
  const projectType = extractProjectTypeFromIssueKey(issueKey);
  if (!projectType) {
    console.warn('[backlog/webhook] rejected: unknown projectType', { issueKey });
    return c.json({ error: `Could not extract project type from issueKey: ${issueKey}` }, 400);
  }

  if (!title) {
    console.warn('[backlog/webhook] rejected: missing title', { issueKey });
    return c.json({ error: 'Missing title in webhook payload' }, 400);
  }

  const url = generateBacklogUrl(issueKey);
  const finalIssueId = issueId || issueKey;

  // カスタムフィールドから日付を抽出
  const fieldConfig = getCustomFieldConfig(projectType);
  const itUpDateValue = fieldConfig.itUpDate
    ? getCustomFieldValue(customFields, fieldConfig.itUpDate)
    : null;
  const releaseDateValue = fieldConfig.releaseDate
    ? getCustomFieldValue(customFields, fieldConfig.releaseDate)
    : null;
  const itUpDate = parseDateString(itUpDateValue);
  const releaseDate = parseDateString(releaseDateValue);

  // タイトルに課題番号を接頭辞として追加
  const formattedTitle = `${issueKey} ${title}`;

  // 既存タスクを検索（issueKey で検索）
  const [existingExternal] = await db
    .select({ taskId: taskExternals.taskId })
    .from(taskExternals)
    .where(eq(taskExternals.issueKey, issueKey));

  const now = new Date();

  if (existingExternal) {
    // 更新
    await db
      .update(tasks)
      .set({
        title: formattedTitle,
        ...(description !== undefined && { description }),
        projectType: projectType as (typeof tasks.projectType.enumValues)[number],
        itUpDate,
        releaseDate,
        updatedAt: now,
      })
      .where(eq(tasks.id, existingExternal.taskId));

    await db
      .update(taskExternals)
      .set({
        issueId: finalIssueId,
        url,
        lastSyncedAt: now,
        syncStatus: 'ok',
      })
      .where(eq(taskExternals.taskId, existingExternal.taskId));

    console.info('[backlog/webhook] updated task', {
      taskId: existingExternal.taskId,
      issueKey,
      projectType,
    });

    return c.json({
      success: true,
      taskId: existingExternal.taskId,
      projectType,
      issueKey,
      updated: true,
    });
  }

  // 新規作成
  const taskId = generateId();
  const externalId = generateId();

  await db.insert(tasks).values({
    id: taskId,
    projectType: projectType as (typeof tasks.projectType.enumValues)[number],
    title: formattedTitle,
    ...(description !== undefined && { description }),
    flowStatus: '未着手',
    assigneeIds: [],
    itUpDate,
    releaseDate,
    kubunLabelId: '',
    backlogUrl: url,
    order: Date.now(),
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(taskExternals).values({
    id: externalId,
    taskId,
    source: 'backlog',
    issueId: finalIssueId,
    issueKey,
    url,
    lastSyncedAt: now,
    syncStatus: 'ok',
  });

  console.info('[backlog/webhook] created task', { taskId, issueKey, projectType });

  return c.json({ success: true, taskId, projectType, issueKey });
});

// --- POST /sync ---

const syncSchema = z.object({
  issueKey: z.string(),
  issueId: z.string(),
  url: z.string(),
  title: z.string(),
  description: z.string().optional(),
  projectType: z.string(),
});

app.post('/sync', zValidator('json', syncSchema), async (c) => {
  const db = c.get('db');
  const data = c.req.valid('json');

  // 既存タスクを検索
  const [existingExternal] = await db
    .select({ taskId: taskExternals.taskId })
    .from(taskExternals)
    .where(eq(taskExternals.issueKey, data.issueKey));

  const now = new Date();

  if (existingExternal) {
    // 更新
    await db
      .update(tasks)
      .set({
        title: data.title,
        description: data.description || '',
        projectType: data.projectType as (typeof tasks.projectType.enumValues)[number],
        updatedAt: now,
      })
      .where(eq(tasks.id, existingExternal.taskId));

    await db
      .update(taskExternals)
      .set({
        issueId: data.issueId,
        url: data.url,
        lastSyncedAt: now,
        syncStatus: 'ok',
      })
      .where(eq(taskExternals.taskId, existingExternal.taskId));

    return c.json({ success: true });
  }

  // 新規作成
  const taskId = generateId();
  const externalId = generateId();

  await db.insert(tasks).values({
    id: taskId,
    projectType: data.projectType as (typeof tasks.projectType.enumValues)[number],
    title: data.title,
    description: data.description || '',
    flowStatus: '未着手',
    assigneeIds: [],
    kubunLabelId: '',
    order: Date.now(),
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(taskExternals).values({
    id: externalId,
    taskId,
    source: 'backlog',
    issueId: data.issueId,
    issueKey: data.issueKey,
    url: data.url,
    lastSyncedAt: now,
    syncStatus: 'ok',
  });

  return c.json({ success: true });
});

export default app;
