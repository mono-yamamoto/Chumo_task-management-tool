import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { tasks, taskExternals, users } from '../db/schema';
import type { Env } from '../index';
import type { Database } from '../db';

type GithubEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<GithubEnv>();

const createIssueSchema = z.object({
  taskId: z.string(),
});

// --- 共通ヘルパー ---

type UrlColumn = 'fireIssueUrl' | 'petIssueUrl';

interface CreateIssueOpts {
  repo: string;
  urlColumn: UrlColumn;
}

const CREATING_MARKER = 'creating...';

/**
 * GitHub Issue 作成の共通ロジック
 * 楽観ロック + Issue作成 + URL保存
 */
async function createGithubIssueForTask(
  db: Database,
  taskId: string,
  githubToken: string,
  opts: CreateIssueOpts
) {
  const { repo, urlColumn } = opts;

  // タスク取得
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) {
    return { error: 'Task not found', status: 404 as const };
  }

  // 既に Issue が作成済みならスキップ
  const existingUrl = task[urlColumn];
  if (existingUrl && existingUrl !== CREATING_MARKER) {
    return { success: true, url: existingUrl, alreadyExists: true };
  }

  // 楽観ロック: 作成中マーカーを原子的にセット（TOCTOU防止）
  const [claimed] = await db
    .update(tasks)
    .set({ [urlColumn]: CREATING_MARKER, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), isNull(tasks[urlColumn])))
    .returning({ id: tasks.id });

  if (!claimed) {
    const [current] = await db
      .select({ url: tasks[urlColumn] })
      .from(tasks)
      .where(eq(tasks.id, taskId));
    if (!current?.url || current.url === CREATING_MARKER) {
      return { error: 'Issue creation in progress', status: 409 as const };
    }
    return { success: true, url: current.url, alreadyExists: true };
  }

  // マーカーをクリアするヘルパー
  const clearMarker = async () => {
    await db
      .update(tasks)
      .set({ [urlColumn]: null, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks[urlColumn], CREATING_MARKER)));
  };

  try {
    // 外部連携情報を取得
    const [external] = await db
      .select()
      .from(taskExternals)
      .where(eq(taskExternals.taskId, taskId));

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
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
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
      await clearMarker();
      const errorText = await res.text();
      return { error: `GitHub API error: ${errorText}`, status: 500 as const };
    }

    const issueData = (await res.json()) as { html_url: string };
    const issueUrl = issueData.html_url;

    // タスクにURLを保存
    await db
      .update(tasks)
      .set({ [urlColumn]: issueUrl, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    return { success: true, url: issueUrl };
  } catch (error) {
    await clearMarker();
    throw error;
  }
}

/**
 * POST /issues
 * Fire Design System の GitHub Issue を作成
 */
app.post('/issues', zValidator('json', createIssueSchema), async (c) => {
  const db = c.get('db');
  const { taskId } = c.req.valid('json');
  const githubToken = c.env.GITHUB_TOKEN;

  if (!githubToken) {
    return c.json({ error: 'GitHub token not configured' }, 500);
  }

  const result = await createGithubIssueForTask(db, taskId, githubToken, {
    repo: 'monosus/ss-fire-design-system',
    urlColumn: 'fireIssueUrl',
  });

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result);
});

/**
 * POST /pet-issues
 * PET (sonysonpo-design-system-and-website) の GitHub Issue を作成
 */
app.post('/pet-issues', zValidator('json', createIssueSchema), async (c) => {
  const db = c.get('db');
  const { taskId } = c.req.valid('json');
  const githubToken = c.env.GITHUB_TOKEN;

  if (!githubToken) {
    return c.json({ error: 'GitHub token not configured' }, 500);
  }

  const result = await createGithubIssueForTask(db, taskId, githubToken, {
    repo: 'monosus/sonysonpo-design-system-and-website',
    urlColumn: 'petIssueUrl',
  });

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result);
});

export default app;
