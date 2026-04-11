import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, and, ne, desc, arrayContains, sql } from 'drizzle-orm';
import { tasks, taskExternals } from '../db/schema';
import { generateId } from '../lib/id';
import type { Env } from '../index';
import type { Database } from '../db';

type TaskEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<TaskEnv>();

// --- Validation Schemas ---

const projectTypeEnum = z.enum([
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

const flowStatusEnum = z.enum([
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

const progressStatusEnum = z
  .enum([
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
  ])
  .nullable()
  .optional();

const priorityEnum = z.enum(['low', 'medium', 'high', 'urgent']).nullable().optional();

const createTaskSchema = z.object({
  projectType: projectTypeEnum,
  title: z.string().min(1),
  description: z.string().optional(),
  flowStatus: flowStatusEnum.default('未着手'),
  progressStatus: progressStatusEnum,
  assigneeIds: z.array(z.string()).default([]),
  itUpDate: z.coerce.date().nullable().optional(),
  releaseDate: z.coerce.date().nullable().optional(),
  kubunLabelId: z.string(),
  googleDriveUrl: z.string().nullable().optional(),
  fireIssueUrl: z.string().nullable().optional(),
  googleChatThreadUrl: z.string().nullable().optional(),
  backlogUrl: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  priority: priorityEnum,
  order: z.number().default(0),
  over3Reason: z.string().optional(),
});

// createTaskSchema の .default() はCREATE時のみ有効にし、
// UPDATE時はデフォルト値で既存データが上書きされないよう除去する
const updateTaskSchema = createTaskSchema
  .omit({ projectType: true })
  .extend({
    flowStatus: flowStatusEnum,
    assigneeIds: z.array(z.string()),
    order: z.number(),
  })
  .partial();

const updateOrderSchema = z.object({
  updates: z.array(
    z.object({
      taskId: z.string(),
      projectType: projectTypeEnum,
      newOrder: z.number(),
    })
  ),
});

// --- Routes ---
// 注意: /order は /:id より前に定義すること（ルートマッチング順序）

/**
 * GET /
 * タスク一覧（ページネーション）
 * projectType 指定時はフィルタ、未指定時は全タスク
 * excludeCompleted=true で完了タスクを除外
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const projectType = c.req.query('projectType');
  const excludeCompleted = c.req.query('excludeCompleted') === 'true';
  const limitValue = parseInt(c.req.query('limit') ?? '50', 10);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  const conditions = [];

  if (projectType) {
    conditions.push(
      eq(tasks.projectType, projectType as (typeof tasks.projectType.enumValues)[number])
    );
  }

  if (excludeCompleted) {
    conditions.push(ne(tasks.flowStatus, '完了'));
  }

  const query = db
    .select()
    .from(tasks)
    .orderBy(
      sql`CASE WHEN ${tasks.flowStatus} = '未着手' AND ${tasks.assigneeIds} = '{}'::text[] THEN 0 ELSE 1 END`,
      desc(tasks.createdAt)
    )
    .limit(limitValue)
    .offset(offset);

  const result = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

  return c.json({ tasks: result, hasMore: result.length === limitValue });
});

/**
 * GET /assigned
 * ユーザーにアサインされたタスク一覧（完了含む）
 */
app.get('/assigned', async (c) => {
  const db = c.get('db');
  const userId = c.req.query('userId') ?? c.get('userId');

  const result = await db
    .select()
    .from(tasks)
    .where(arrayContains(tasks.assigneeIds, [userId]));

  return c.json({ tasks: result });
});

/**
 * PUT /order
 * タスクの並び順を一括更新（/:id より前に定義）
 */
app.put('/order', zValidator('json', updateOrderSchema), async (c) => {
  const db = c.get('db');
  const { updates } = c.req.valid('json');

  const now = new Date();

  await Promise.all(
    updates.map(({ taskId, newOrder }) =>
      db.update(tasks).set({ order: newOrder, updatedAt: now }).where(eq(tasks.id, taskId))
    )
  );

  return c.json({ success: true });
});

/**
 * GET /:id
 * タスク詳細
 */
app.get('/:id', async (c) => {
  const db = c.get('db');
  const taskId = c.req.param('id');

  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // external情報も取得
  const [external] = await db.select().from(taskExternals).where(eq(taskExternals.taskId, taskId));

  return c.json({ task: { ...task, external: external ?? undefined } });
});

/**
 * POST /
 * タスク作成
 */
app.post('/', zValidator('json', createTaskSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const data = c.req.valid('json');
  const id = generateId();

  const now = new Date();

  await db.insert(tasks).values({
    id,
    ...data,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ id }, 201);
});

/**
 * PUT /:id
 * タスク更新
 */
app.put('/:id', zValidator('json', updateTaskSchema), async (c) => {
  const db = c.get('db');
  const taskId = c.req.param('id');
  const data = c.req.valid('json');

  const [existing] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId));
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  return c.json({ success: true });
});

/**
 * DELETE /:id
 * タスク削除
 */
app.delete('/:id', async (c) => {
  const db = c.get('db');
  const taskId = c.req.param('id');

  const [existing] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId));
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }

  await db.delete(tasks).where(eq(tasks.id, taskId));

  return c.json({ success: true });
});

export default app;
