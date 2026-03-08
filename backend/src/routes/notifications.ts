import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq, inArray } from 'drizzle-orm';
import { tasks, users } from '../db/schema';
import type { Env } from '../index';
import type { Database } from '../db';

type NotificationEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<NotificationEnv>();

const mentionNotificationSchema = z.object({
  taskId: z.string(),
  commentId: z.string(),
  authorId: z.string(),
  content: z.string(),
  mentionedUserIds: z.array(z.string()),
  projectType: z.string(),
});

/**
 * HTMLタグを除去してプレーンテキストを取得
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * POST /mention
 * コメントメンション通知を送信
 * コメント作成時にフロントエンドまたはコメントルートから呼び出される
 */
app.post('/mention', zValidator('json', mentionNotificationSchema), async (c) => {
  const db = c.get('db');
  const data = c.req.valid('json');

  // 自分自身へのメンションを除外
  const targetUserIds = data.mentionedUserIds.filter((id) => id !== data.authorId);
  if (targetUserIds.length === 0) {
    return c.json({ success: true, sent: 0 });
  }

  // コメント投稿者の情報
  const [author] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, data.authorId));
  const authorName = author?.displayName || '不明なユーザー';

  // タスク情報
  const [task] = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(eq(tasks.id, data.taskId));
  const taskTitle = task?.title || 'タスク';

  // コンテンツプレビュー
  const strippedContent = stripHtml(data.content);
  const contentPreview =
    strippedContent.length > 50 ? `${strippedContent.substring(0, 50)}...` : strippedContent;

  // メンションされたユーザーのFCMトークンを取得
  const mentionedUsers = await db
    .select({ id: users.id, fcmTokens: users.fcmTokens })
    .from(users)
    .where(inArray(users.id, targetUserIds));

  const tokensToSend: string[] = [];
  for (const u of mentionedUsers) {
    if (u.fcmTokens && u.fcmTokens.length > 0) {
      tokensToSend.push(...u.fcmTokens);
    }
  }

  if (tokensToSend.length === 0) {
    return c.json({ success: true, sent: 0 });
  }

  // 通知ペイロード構築
  const appOrigin = c.env?.APP_ORIGIN || '';
  const taskUrl = appOrigin ? `${appOrigin}/tasks/${data.taskId}` : `/tasks/${data.taskId}`;

  const notification = {
    title: `${authorName}さんがあなたをメンションしました`,
    body: `${taskTitle}: ${contentPreview}`,
    data: {
      type: 'mention',
      projectType: data.projectType,
      taskId: data.taskId,
      commentId: data.commentId,
      authorId: data.authorId,
      clickAction: taskUrl,
    },
  };

  // TODO: Web Push API で実際に送信する
  // 現時点では通知ペイロードの構築のみ行い、送信は Phase 5 以降で実装
  // FCM → Web Push への移行は Cloudflare Workers の制約があるため別途対応

  return c.json({
    success: true,
    sent: tokensToSend.length,
    notification,
  });
});

export default app;
