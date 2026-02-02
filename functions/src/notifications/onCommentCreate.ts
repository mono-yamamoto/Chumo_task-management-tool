import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();

/**
 * Secret Managerから値を取得
 */
async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GCLOUD_PROJECT || '';
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  return version.payload?.data?.toString() || '';
}

interface CommentData {
  taskId: string;
  authorId: string;
  content: string;
  mentionedUserIds?: string[];
  readBy: string[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface UserData {
  displayName: string;
  email: string;
  fcmTokens?: string[];
}

interface TaskData {
  title: string;
  projectType: string;
}

/**
 * コメント作成時にメンションされたユーザーにプッシュ通知を送信
 */
export const onCommentCreate = onDocumentCreated(
  {
    document: 'projects/{projectType}/taskComments/{commentId}',
    region: 'asia-northeast1',
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('No data associated with the event');
      return;
    }

    const commentData = snapshot.data() as CommentData;
    const { projectType, commentId } = event.params;

    // メンションがない場合は何もしない
    if (!commentData.mentionedUserIds || commentData.mentionedUserIds.length === 0) {
      logger.info('No mentions in comment', { commentId });
      return;
    }

    // 自分自身へのメンションを除外
    const mentionedUserIds = commentData.mentionedUserIds.filter(
      (userId) => userId !== commentData.authorId
    );

    if (mentionedUserIds.length === 0) {
      logger.info('All mentions are self-mentions', { commentId });
      return;
    }

    const db = getFirestore();
    const messaging = getMessaging();

    try {
      // コメント投稿者の情報を取得
      const authorDoc = await db.collection('users').doc(commentData.authorId).get();
      const authorData = authorDoc.data() as UserData | undefined;
      const authorName = authorData?.displayName || '不明なユーザー';

      // タスクの情報を取得
      const taskDoc = await db
        .collection('projects')
        .doc(projectType)
        .collection('tasks')
        .doc(commentData.taskId)
        .get();
      const taskData = taskDoc.data() as TaskData | undefined;
      const taskTitle = taskData?.title || 'タスク';

      // コメント内容のプレビュー（HTMLタグを除去して50文字まで）
      const strippedContent = stripHtml(commentData.content);
      const contentPreview = strippedContent.substring(0, 50);

      // メンションされた各ユーザーのFCMトークンを取得
      const tokensToSend: string[] = [];
      const userTokensMap: Map<string, string[]> = new Map();

      for (const userId of mentionedUserIds) {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() as UserData | undefined;

        if (userData?.fcmTokens && userData.fcmTokens.length > 0) {
          userTokensMap.set(userId, userData.fcmTokens);
          tokensToSend.push(...userData.fcmTokens);
        }
      }

      if (tokensToSend.length === 0) {
        logger.info('No FCM tokens found for mentioned users', {
          commentId,
          mentionedUserIds,
        });
        return;
      }

      // APP_ORIGINを取得して完全URLを構築
      let appOrigin = '';
      try {
        appOrigin = await getSecret('APP_ORIGIN');
      } catch (error) {
        logger.warn('Failed to get APP_ORIGIN from Secret Manager, using relative path', {
          error,
        });
      }

      // 完全URL or フォールバックで相対パス
      const taskPath = `/tasks/${commentData.taskId}`;
      const taskUrl = appOrigin ? `${appOrigin}${taskPath}` : taskPath;

      // 通知を送信
      const notification = {
        title: `${authorName}さんがあなたをメンションしました`,
        body: `${taskTitle}: ${contentPreview}${strippedContent.length > 50 ? '...' : ''}`,
      };

      const data = {
        type: 'mention',
        projectType,
        taskId: commentData.taskId,
        commentId,
        authorId: commentData.authorId,
        clickAction: taskUrl,
      };

      const response = await messaging.sendEachForMulticast({
        tokens: tokensToSend,
        notification,
        data,
        webpush: {
          fcmOptions: {
            link: taskUrl,
          },
        },
      });

      logger.info('Push notifications sent', {
        commentId,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      // 失敗したトークンを削除
      if (response.failureCount > 0) {
        const tokensToRemove: { userId: string; token: string }[] = [];

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const failedToken = tokensToSend[idx];

            // どのユーザーのトークンか特定
            for (const [userId, tokens] of userTokensMap.entries()) {
              if (tokens.includes(failedToken)) {
                tokensToRemove.push({ userId, token: failedToken });
                break;
              }
            }

            logger.warn('Failed to send notification', {
              token: failedToken.substring(0, 20) + '...',
              error: resp.error?.message,
            });
          }
        });

        // 無効なトークンを削除
        for (const { userId, token } of tokensToRemove) {
          try {
            await db
              .collection('users')
              .doc(userId)
              .update({
                fcmTokens: FieldValue.arrayRemove(token),
              });
            logger.info('Removed invalid FCM token', { userId });
          } catch (error) {
            logger.error('Failed to remove invalid token', { userId, error });
          }
        }
      }
    } catch (error) {
      logger.error('Error sending push notifications', { commentId, error });
      throw error;
    }
  }
);

/**
 * HTMLタグを除去してプレーンテキストを取得
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // HTMLタグを削除
    .replace(/&nbsp;/g, ' ') // &nbsp;をスペースに
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
