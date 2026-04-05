import { eq, inArray } from 'drizzle-orm';
import { notifications, tasks, users } from '../db/schema';
import { generateId } from './id';
import type { Database } from '../db';

/**
 * HTMLタグを除去してプレーンテキストを取得
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

interface MentionNotificationParams {
  taskId: string;
  commentId: string;
  authorId: string;
  content: string;
  mentionedUserIds: string[];
}

/**
 * メンション通知を作成
 * コメント投稿時にサーバーサイドで呼び出される
 */
export async function createMentionNotifications(
  db: Database,
  params: MentionNotificationParams
): Promise<number> {
  const { taskId, commentId, authorId, content, mentionedUserIds } = params;

  // 自分自身へのメンションを除外
  const targetUserIds = mentionedUserIds.filter((id) => id !== authorId);
  if (targetUserIds.length === 0) return 0;

  // 投稿者名とタスクタイトルを取得
  const [[author], [task]] = await Promise.all([
    db.select({ displayName: users.displayName }).from(users).where(eq(users.id, authorId)),
    db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, taskId)),
  ]);
  const authorName = author?.displayName || '不明なユーザー';
  const taskTitle = task?.title || 'タスク';

  // コンテンツプレビュー
  const stripped = stripHtml(content);
  const preview = stripped.length > 50 ? `${stripped.substring(0, 50)}...` : stripped;

  const title = `${authorName}さんがあなたをメンションしました`;
  const body = `${taskTitle}: ${preview}`;

  // 通知レコード一括挿入
  const rows = targetUserIds.map((recipientId) => ({
    id: generateId(),
    recipientId,
    type: 'mention' as const,
    title,
    body,
    taskId,
    commentId,
    actorId: authorId,
  }));

  await db.insert(notifications).values(rows);
  return rows.length;
}

interface SessionReminderParams {
  taskId: string;
  targetUserIds: string[];
  senderId: string;
}

/**
 * セッション未記録通知を作成
 */
export async function createSessionReminderNotifications(
  db: Database,
  params: SessionReminderParams
): Promise<number> {
  const { taskId, targetUserIds, senderId } = params;
  if (targetUserIds.length === 0) return 0;

  const [task] = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, taskId));
  const taskTitle = task?.title || 'タスク';

  const rows = targetUserIds.map((recipientId) => ({
    id: generateId(),
    recipientId,
    type: 'session_reminder' as const,
    title: 'セッション未記録のお知らせ',
    body: `タスク『${taskTitle}』のセッションが未記録です`,
    taskId,
    actorId: senderId,
  }));

  await db.insert(notifications).values(rows);
  return rows.length;
}
