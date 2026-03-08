import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, inArray } from 'drizzle-orm';
import { tasks, users } from '../db/schema';
import type { Env } from '../index';
import type { Database } from '../db';

type ChatEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<ChatEnv>();

const createThreadSchema = z.object({
  taskId: z.string(),
});

/**
 * Google ChatのメッセージURLを構築
 */
function buildThreadUrl(
  spaceBaseUrl: string,
  messageName?: string | null,
  threadName?: string | null
): string {
  const sanitizedBase = spaceBaseUrl.replace(/\/+$/, '');

  if (!messageName) return sanitizedBase;

  const messageNameMatch = messageName.match(/spaces\/([^/]+)\/messages\/([^?]+)/);
  if (!messageNameMatch) return sanitizedBase;

  const [, spaceId, messageId] = messageNameMatch;

  let threadId = messageId;
  if (threadName) {
    const threadNameMatch = threadName.match(/spaces\/[^/]+\/threads\/([^?]+)/);
    if (threadNameMatch) {
      threadId = threadNameMatch[1];
    }
  }

  let finalSpaceId = spaceId;
  if (sanitizedBase.includes('chat.google.com/room/')) {
    const spaceIdMatch = sanitizedBase.match(/chat\.google\.com\/room\/([^/]+)/);
    if (spaceIdMatch) {
      finalSpaceId = spaceIdMatch[1];
    }
  }

  if (sanitizedBase.includes('chat.google.com')) {
    return `https://chat.google.com/room/${finalSpaceId}/${threadId}/${messageId}?cls=10`;
  }

  if (sanitizedBase.includes('mail.google.com')) {
    return `${sanitizedBase}/${threadId}/${messageId}`;
  }

  return `${sanitizedBase}/${threadId}/${messageId}`;
}

/**
 * POST /threads
 * Google Chatスレッド作成
 */
app.post('/threads', zValidator('json', createThreadSchema), async (c) => {
  const db = c.get('db');
  const { taskId } = c.req.valid('json');

  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // 既にスレッド作成済み
  if (task.googleChatThreadUrl) {
    return c.json({ success: true, url: task.googleChatThreadUrl, alreadyExists: true });
  }

  const webhookUrl = c.env.GOOGLE_CHAT_WEBHOOK_URL;
  const spaceBaseUrl = c.env.GOOGLE_CHAT_SPACE_URL;

  if (!webhookUrl || !spaceBaseUrl) {
    return c.json({ error: 'Google Chat secrets are not configured' }, 500);
  }

  // メンション用にchatIdを取得
  const mentions: string[] = [];
  if (task.assigneeIds.length > 0) {
    const assignedUsers = await db
      .select({ chatId: users.chatId })
      .from(users)
      .where(inArray(users.id, task.assigneeIds));

    for (const u of assignedUsers) {
      if (u.chatId && u.chatId.trim().length > 0) {
        mentions.push(`<users/${u.chatId.trim()}>`);
      }
    }
  }

  const backlogUrl = task.backlogUrl || '';
  const mentionText = mentions.length > 0 ? mentions.join(' ') : '';
  const messageText = mentionText
    ? `${task.title}\n${backlogUrl}\n${mentionText}`
    : `${task.title}\n${backlogUrl}`;

  const webhookRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: messageText }),
  });

  if (!webhookRes.ok) {
    const errorPayload = await webhookRes.text();
    return c.json({ error: `Google Chat webhook error: ${errorPayload}` }, 500);
  }

  const webhookJson = (await webhookRes.json().catch(() => null)) as {
    name?: string;
    thread?: { name?: string };
  } | null;

  const firstMessageName = webhookJson?.name || null;
  const threadName = webhookJson?.thread?.name || null;
  const threadUrl = buildThreadUrl(spaceBaseUrl, firstMessageName, threadName);

  await db
    .update(tasks)
    .set({ googleChatThreadUrl: threadUrl, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  return c.json({ success: true, url: threadUrl });
});

export default app;
