import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { contacts } from '../db/schema';
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
  const issueTitle = `[${typeLabel}] ${data.title}`;

  let issueBody: string;
  if (data.type === 'error' && data.errorReportDetails) {
    const details = data.errorReportDetails;
    const envLines = [`- デバイス: ${details.environment.device}`];

    if (details.environment.device === 'PC') {
      envLines.push(`- OS: ${details.environment.os}`);
      if (details.environment.osVersion) {
        envLines.push(`- OSのバージョン: ${details.environment.osVersion}`);
      }
    } else {
      envLines.push(`- スマホの種類: ${details.environment.os}`);
      if (details.environment.osVersion) {
        envLines.push(`- スマホのバージョン: ${details.environment.osVersion}`);
      }
    }

    envLines.push(`- ブラウザ: ${details.environment.browser}`);
    if (details.environment.browserVersion) {
      envLines.push(`- ブラウザのバージョン: ${details.environment.browserVersion}`);
    }
    if (details.screenshotUrl) {
      envLines.push(`- スクリーンショット: ${details.screenshotUrl}`);
    }

    issueBody = [
      `**お問い合わせの種類**: ${typeLabel}`,
      `**送信者**: ${data.userName} (${data.userEmail})`,
      `**お問い合わせID**: ${contactId}`,
      '',
      '---',
      '',
      '## 事象',
      details.issue,
      '',
      '## 再現方法',
      details.reproductionSteps,
      '',
      '## 環境',
      ...envLines,
      '',
      '---',
      '',
      data.content ? `**その他の情報**:\n${data.content}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  } else {
    issueBody = [
      `**お問い合わせの種類**: ${typeLabel}`,
      `**送信者**: ${data.userName} (${data.userEmail})`,
      `**お問い合わせID**: ${contactId}`,
      '',
      '---',
      '',
      '**内容**:',
      data.content || '',
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
