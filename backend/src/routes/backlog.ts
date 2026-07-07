import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { tasks, taskExternals } from '../db/schema';
import { generateId } from '../lib/id';
import {
  extractIssueFromPayload,
  extractProjectTypeFromIssueKey,
  generateBacklogUrl,
  getCustomFieldConfig,
  resolveCustomDateField,
  IT_UP_DATE_FIELD_NAMES,
  RELEASE_DATE_FIELD_NAMES,
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
  const { issueKey, issueId, title, description, customFields, changes } =
    extractIssueFromPayload(body);
  console.info('[backlog/webhook] parsed', {
    issueKey,
    issueId,
    hasTitle: Boolean(title),
    hasDescription: description !== undefined,
    customFieldsCount: customFields?.length ?? 0,
    changesCount: changes?.length ?? 0,
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

  // カスタムフィールド（追加イベント）または changes（更新イベント）から日付を解決
  // undefined = ペイロードに情報なし（更新時は既存値を維持する）
  const fieldConfig = getCustomFieldConfig(projectType);
  const itUpDate = resolveCustomDateField(
    customFields,
    changes,
    fieldConfig.itUpDate,
    IT_UP_DATE_FIELD_NAMES
  );
  const releaseDate = resolveCustomDateField(
    customFields,
    changes,
    fieldConfig.releaseDate,
    RELEASE_DATE_FIELD_NAMES
  );

  // changes の field 表記が想定と違う場合の調査用ログ
  // （日付フィールド未設定のプロジェクトや日付以外の変更で埋もれないよう対象を限定）
  const hasDateFieldConfig = Boolean(fieldConfig.itUpDate || fieldConfig.releaseDate);
  if (
    hasDateFieldConfig &&
    (changes?.length ?? 0) > 0 &&
    itUpDate === undefined &&
    releaseDate === undefined
  ) {
    console.info('[backlog/webhook] no date fields matched in changes', {
      issueKey,
      changeFields: changes?.map((ch) => ch.field),
    });
  }

  // タイトルに課題番号を接頭辞として追加
  const formattedTitle = `${issueKey} ${title}`;

  // 既存タスクを検索（issueKey で検索）
  const [existingExternal] = await db
    .select({ taskId: taskExternals.taskId })
    .from(taskExternals)
    .where(eq(taskExternals.issueKey, issueKey));

  const now = new Date();
  let existingTaskId = existingExternal?.taskId ?? null;
  let linked = false;

  // 外部連携が無い場合、タイトル先頭の課題番号が一致する未リンクタスクを探してリンクする
  // （Webhook停止期間などに手動作成されたタスクへの重複作成を防ぐ）
  if (!existingTaskId) {
    const titlePattern = `^${issueKey}([ 　]|$)`;
    const [unlinkedTask] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .leftJoin(taskExternals, eq(taskExternals.taskId, tasks.id))
      .where(and(isNull(taskExternals.id), sql`${tasks.title} ~ ${titlePattern}`))
      .orderBy(asc(tasks.createdAt))
      .limit(1);

    if (unlinkedTask) {
      try {
        await db.insert(taskExternals).values({
          id: generateId(),
          taskId: unlinkedTask.id,
          source: 'backlog',
          issueId: finalIssueId,
          issueKey,
          url,
          lastSyncedAt: now,
          syncStatus: 'ok',
        });
        existingTaskId = unlinkedTask.id;
        linked = true;
        console.info('[backlog/webhook] linked unlinked task by title', {
          taskId: unlinkedTask.id,
          issueKey,
        });
      } catch (err) {
        // Webhookの重複配信で別リクエストが先にリンクした場合（UNIQUE制約違反）は
        // 既存リンクへフォールバックして通常の更新フローに乗せる
        const [raceExternal] = await db
          .select({ taskId: taskExternals.taskId })
          .from(taskExternals)
          .where(eq(taskExternals.issueKey, issueKey));
        if (!raceExternal) throw err;
        existingTaskId = raceExternal.taskId;
        console.info('[backlog/webhook] link race detected, fell back to existing link', {
          taskId: raceExternal.taskId,
          issueKey,
        });
      }
    }
  }

  if (existingTaskId) {
    // 更新
    await db
      .update(tasks)
      .set({
        title: formattedTitle,
        ...(description !== undefined && { description }),
        projectType: projectType as (typeof tasks.projectType.enumValues)[number],
        ...(itUpDate !== undefined && { itUpDate }),
        ...(releaseDate !== undefined && { releaseDate }),
        ...(linked && { backlogUrl: url }),
        updatedAt: now,
      })
      .where(eq(tasks.id, existingTaskId));

    // リンク直後は insert したばかりの値と同一なので更新不要
    if (!linked) {
      await db
        .update(taskExternals)
        .set({
          issueId: finalIssueId,
          url,
          lastSyncedAt: now,
          syncStatus: 'ok',
        })
        .where(eq(taskExternals.taskId, existingTaskId));
    }

    console.info('[backlog/webhook] updated task', {
      taskId: existingTaskId,
      issueKey,
      projectType,
    });

    return c.json({
      success: true,
      taskId: existingTaskId,
      projectType,
      issueKey,
      updated: true,
      ...(linked && { linked: true }),
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
    itUpDate: itUpDate ?? null,
    releaseDate: releaseDate ?? null,
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
