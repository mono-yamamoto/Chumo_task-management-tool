import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, desc } from 'drizzle-orm';
import { contacts, users } from '../db/schema';
import { generateId } from '../lib/id';
import type { Env } from '../index';
import type { Database } from '../db';

type ContactEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<ContactEnv>();

const errorReportDetailsSchema = z.object({
  issue: z.string(),
  reproductionSteps: z.string(),
  environment: z.object({
    device: z.enum(['PC', 'SP']),
    os: z.string(),
    browser: z.string(),
    osVersion: z.string().optional(),
    browserVersion: z.string(),
  }),
  screenshotUrl: z.string().optional(),
});

const createContactSchema = z.object({
  type: z.enum(['error', 'feature', 'other']),
  title: z.string().min(1),
  content: z.string().optional(),
  userName: z.string(),
  userEmail: z.string(),
  errorReportDetails: errorReportDetailsSchema.optional(),
});

function getContactTypeLabel(type: string): string {
  switch (type) {
    case 'error':
      return 'エラー報告';
    case 'feature':
      return '要望';
    default:
      return 'そのほか';
  }
}

/** Markdownインジェクション防止: ユーザー入力をGitHub Issue本文に埋め込む前にエスケープ */
function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!|~>])/g, '\\$1');
}

async function requireAdmin(db: Database, userId: string): Promise<boolean> {
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  return !!user && user.role === 'admin';
}

function getContactTypeLabelForGitHub(type: string): string {
  switch (type) {
    case 'error':
      return 'bug';
    case 'feature':
      return 'enhancement';
    default:
      return 'question';
  }
}

/**
 * GET /
 * お問い合わせ一覧（ステータスでフィルタ）
 */
app.get('/', async (c) => {
  const db = c.get('db');
  const status = c.req.query('status') as 'pending' | 'resolved' | undefined;

  if (!status || !['pending', 'resolved'].includes(status)) {
    return c.json({ error: 'status query parameter is required (pending or resolved)' }, 400);
  }

  const orderField = status === 'pending' ? contacts.createdAt : contacts.updatedAt;

  const result = await db
    .select()
    .from(contacts)
    .where(eq(contacts.status, status))
    .orderBy(desc(orderField));

  return c.json({ contacts: result });
});

/**
 * PUT /:id
 * お問い合わせステータス更新（admin専用）
 */
app.put('/:id', async (c) => {
  const db = c.get('db');
  if (!(await requireAdmin(db, c.get('userId')))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const contactId = c.req.param('id');
  const { status } = await c.req.json<{ status: 'pending' | 'resolved' }>();

  if (!status || !['pending', 'resolved'].includes(status)) {
    return c.json({ error: 'status is required (pending or resolved)' }, 400);
  }

  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.id, contactId));

  if (!existing) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  await db
    .update(contacts)
    .set({ status, updatedAt: new Date() })
    .where(eq(contacts.id, contactId));

  return c.json({ success: true });
});

/**
 * POST /
 * お問い合わせ作成 + GitHub Issue 作成
 */
app.post('/', zValidator('json', createContactSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const data = c.req.valid('json');

  // エラー報告以外はcontent必須
  if (data.type !== 'error' && !data.content) {
    return c.json({ error: 'Content is required for non-error contacts' }, 400);
  }

  const contactId = generateId();
  const now = new Date();

  // お問い合わせをDBに保存
  await db.insert(contacts).values({
    id: contactId,
    type: data.type,
    title: data.title,
    content: data.content || '',
    userId,
    userName: data.userName,
    userEmail: data.userEmail,
    errorReportDetails: data.errorReportDetails || null,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });

  // GitHub Issue 作成
  const githubToken = c.env.GITHUB_TOKEN;
  if (!githubToken) {
    return c.json({ id: contactId, warning: 'GitHub token not configured' }, 201);
  }

  const typeLabel = getContactTypeLabel(data.type);
  const issueTitle = `[${typeLabel}] ${escapeMarkdown(data.title)}`;

  // ユーザー入力をエスケープしてGitHub Issue本文を構築
  const safeUserName = escapeMarkdown(data.userName);
  const safeEmail = escapeMarkdown(data.userEmail);
  const safeContent = data.content ? escapeMarkdown(data.content) : '';

  let issueBody: string;
  if (data.type === 'error' && data.errorReportDetails) {
    const details = data.errorReportDetails;
    const envLines = [`- デバイス: ${details.environment.device}`];

    if (details.environment.device === 'PC') {
      envLines.push(`- OS: ${escapeMarkdown(details.environment.os)}`);
      if (details.environment.osVersion) {
        envLines.push(`- OSのバージョン: ${escapeMarkdown(details.environment.osVersion)}`);
      }
    } else {
      envLines.push(`- スマホの種類: ${escapeMarkdown(details.environment.os)}`);
      if (details.environment.osVersion) {
        envLines.push(`- スマホのバージョン: ${escapeMarkdown(details.environment.osVersion)}`);
      }
    }

    envLines.push(`- ブラウザ: ${escapeMarkdown(details.environment.browser)}`);
    if (details.environment.browserVersion) {
      envLines.push(
        `- ブラウザのバージョン: ${escapeMarkdown(details.environment.browserVersion)}`
      );
    }
    if (details.screenshotUrl) {
      envLines.push(`- スクリーンショット: ${escapeMarkdown(details.screenshotUrl)}`);
    }

    issueBody = [
      `**お問い合わせの種類**: ${typeLabel}`,
      `**送信者**: ${safeUserName} (${safeEmail})`,
      `**お問い合わせID**: ${contactId}`,
      '',
      '---',
      '',
      '## 事象',
      escapeMarkdown(details.issue),
      '',
      '## 再現方法',
      escapeMarkdown(details.reproductionSteps),
      '',
      '## 環境',
      ...envLines,
      '',
      '---',
      '',
      safeContent ? `**その他の情報**:\n${safeContent}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  } else {
    issueBody = [
      `**お問い合わせの種類**: ${typeLabel}`,
      `**送信者**: ${safeUserName} (${safeEmail})`,
      `**お問い合わせID**: ${contactId}`,
      '',
      '---',
      '',
      '**内容**:',
      safeContent,
    ]
      .filter(Boolean)
      .join('\n');
  }

  const res = await fetch(
    'https://api.github.com/repos/mono-yamamoto/Chumo_task-management-tool/issues',
    {
      method: 'POST',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'chumo-api',
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: [getContactTypeLabelForGitHub(data.type)],
      }),
    }
  );

  if (!res.ok) {
    return c.json({ id: contactId, warning: 'Failed to create GitHub issue' }, 201);
  }

  const issueData = (await res.json()) as { html_url: string };

  await db
    .update(contacts)
    .set({ githubIssueUrl: issueData.html_url, updatedAt: new Date() })
    .where(eq(contacts.id, contactId));

  return c.json({ id: contactId, githubIssueUrl: issueData.html_url }, 201);
});

export default app;
