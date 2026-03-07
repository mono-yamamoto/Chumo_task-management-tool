import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, inArray } from 'drizzle-orm';
import { tasks, taskExternals, users } from '../db/schema';
import type { Env } from '../index';
import type { Database } from '../db';

type GithubEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<GithubEnv>();

const createIssueSchema = z.object({
  taskId: z.string(),
});

/**
 * POST /issues
 * タスクからGitHub Issueを作成
 */
app.post('/issues', zValidator('json', createIssueSchema), async (c) => {
  const db = c.get('db');
  const { taskId } = c.req.valid('json');

  // タスク取得
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // 既に Issue が作成済みならスキップ
  if (task.fireIssueUrl) {
    return c.json({ success: true, url: task.fireIssueUrl, alreadyExists: true });
  }

  // 外部連携情報を取得
  const [external] = await db.select().from(taskExternals).where(eq(taskExternals.taskId, taskId));

  // GitHubトークン
  const githubToken = c.env.GITHUB_TOKEN;
  if (!githubToken) {
    return c.json({ error: 'GitHub token not configured' }, 500);
  }

  // アサインされたユーザーのGitHub usernameを取得
  const assignees: string[] = [];
  if (task.assigneeIds.length > 0) {
    const assignedUsers = await db
      .select({ githubUsername: users.githubUsername })
      .from(users)
      .where(inArray(users.id, task.assigneeIds));

    for (const u of assignedUsers) {
      if (u.githubUsername) {
        assignees.push(u.githubUsername);
      }
    }
  }

  // Issue タイトル構築（issueKey重複防止）
  const titleStartsWithIssueKey = external?.issueKey && task.title.startsWith(external.issueKey);
  const issueTitle =
    external?.issueKey && !titleStartsWithIssueKey
      ? `${external.issueKey} ${task.title}`
      : task.title;

  const issueBody = [external?.url ? `Backlog: ${external.url}` : '', task.description || '']
    .filter(Boolean)
    .join('\n\n');

  // GitHub API 呼び出し
  const res = await fetch('https://api.github.com/repos/monosus/ss-fire-design-system/issues', {
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
      assignees: assignees.length > 0 ? assignees : undefined,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return c.json({ error: `GitHub API error: ${errorText}` }, 500);
  }

  const issueData = (await res.json()) as { html_url: string };
  const issueUrl = issueData.html_url;

  // タスクにURLを保存
  await db
    .update(tasks)
    .set({ fireIssueUrl: issueUrl, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  return c.json({ success: true, url: issueUrl });
});

export default app;
