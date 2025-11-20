import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const db = getFirestore();
const secretClient = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GCLOUD_PROJECT || '';
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  return version.payload?.data?.toString() || '';
}

/**
 * Google ChatのメッセージURLを構築
 * 実際のURL形式: https://chat.google.com/room/{spaceId}/{threadId}/{messageId}?cls=10
 *
 * @param spaceBaseUrl スペースのベースURL（例: https://chat.google.com/room/AAQApGRYb9c）
 * @param messageName メッセージ名（形式: spaces/{spaceId}/messages/{messageId}）
 * @param threadName スレッド名（形式: spaces/{spaceId}/threads/{threadId}、オプション）
 */
function buildThreadUrl(
  spaceBaseUrl: string,
  messageName?: string | null,
  threadName?: string | null
): string {
  const sanitizedBase = spaceBaseUrl.replace(/\/+$/, '');

  if (!messageName) {
    console.warn('No messageName provided, returning base URL');
    return sanitizedBase;
  }

  // messageNameの形式: spaces/{spaceId}/messages/{messageId}
  const messageNameMatch = messageName.match(/spaces\/([^/]+)\/messages\/([^?]+)/);

  if (!messageNameMatch) {
    console.warn('Invalid messageName format:', messageName);
    return sanitizedBase;
  }

  const [, spaceId, messageId] = messageNameMatch;

  // スレッドIDを取得（threadNameから、またはmessageIdをスレッドIDとして使用）
  let threadId = messageId; // デフォルトはメッセージIDと同じ
  if (threadName) {
    const threadNameMatch = threadName.match(/spaces\/[^/]+\/threads\/([^?]+)/);
    if (threadNameMatch) {
      threadId = threadNameMatch[1];
    }
  }

  // spaceBaseUrlからspaceIdを抽出（既に含まれている場合）
  // または、messageNameから取得したspaceIdを使用
  let finalSpaceId = spaceId;
  if (sanitizedBase.includes('chat.google.com/room/')) {
    // URLからspaceIdを抽出
    const spaceIdMatch = sanitizedBase.match(/chat\.google\.com\/room\/([^/]+)/);
    if (spaceIdMatch) {
      finalSpaceId = spaceIdMatch[1];
    }
  }

  // Google ChatのWeb UI形式: https://chat.google.com/room/{spaceId}/{threadId}/{messageId}?cls=10
  if (sanitizedBase.includes('chat.google.com')) {
    return `https://chat.google.com/room/${finalSpaceId}/${threadId}/${messageId}?cls=10`;
  }

  // GmailのChatスペース形式の場合
  // https://mail.google.com/mail/u/1/#chat/space/{spaceId}
  if (sanitizedBase.includes('mail.google.com')) {
    // GmailのChatスペースURLにスレッドIDとメッセージIDを追加
    // 形式: https://mail.google.com/mail/u/1/#chat/space/{spaceId}/{threadId}/{messageId}
    return `${sanitizedBase}/${threadId}/${messageId}`;
  }

  // その他の形式の場合、スレッドIDとメッセージIDを追加
  return `${sanitizedBase}/${threadId}/${messageId}`;
}

export const createGoogleChatThread = onRequest(
  {
    cors: true,
    maxInstances: 10,
    region: 'asia-northeast1',
  },
  async (req, res) => {
    // CORSヘッダーを設定
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const pathParts = req.path.split('/').filter(Boolean);
      const projectIdIndex = pathParts.indexOf('projects');
      const taskIdIndex = pathParts.indexOf('tasks');

      if (projectIdIndex === -1 || taskIdIndex === -1 || taskIdIndex <= projectIdIndex) {
        res
          .status(400)
          .json({ error: 'Invalid path format. Expected: /projects/{projectId}/tasks/{taskId}' });
        return;
      }

      const projectId = pathParts[projectIdIndex + 1];
      const taskId = pathParts[taskIdIndex + 1];

      if (!projectId || !taskId) {
        res.status(400).json({ error: 'Missing projectId or taskId' });
        return;
      }

      const taskDoc = await db
        .collection('projects')
        .doc(projectId)
        .collection('tasks')
        .doc(taskId)
        .get();

      if (!taskDoc.exists) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const task = taskDoc.data();
      if (!task) {
        res.status(404).json({ error: 'Task data not found' });
        return;
      }

      if (task.googleChatThreadUrl) {
        res.status(200).json({ success: true, url: task.googleChatThreadUrl, alreadyExists: true });
        return;
      }

      const [webhookUrl, spaceBaseUrl] = await Promise.all([
        getSecret('GOOGLE_CHAT_WEBHOOK_URL'),
        getSecret('GOOGLE_CHAT_SPACE_URL'),
      ]);

      if (!webhookUrl || !spaceBaseUrl) {
        res.status(500).json({ error: 'Google Chat secrets are not configured' });
        return;
      }

      // BacklogのURLを取得（優先順位: backlogUrl > external.url）
      const backlogUrl = task.backlogUrl || task.external?.url || null;

      const assigneeIds: string[] = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
      const mentions: string[] = [];

      // メンション用にchatIdを取得（Google ChatのユーザーID）
      for (const userId of assigneeIds) {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const chatId = userData?.chatId;
          if (chatId && typeof chatId === 'string' && chatId.trim().length > 0) {
            // Google Chatのメンション形式: <users/chatId>
            mentions.push(`<users/${chatId.trim()}>`);
          }
        }
      }

      const messageTitle = typeof task.title === 'string' ? task.title : 'タスク';

      // メンションがある場合はメンションを追加
      const mentionText = mentions.length > 0 ? mentions.join(' ') : '';
      const urlText = backlogUrl || '';
      const messageText = mentionText
        ? `${messageTitle}\n${urlText}\n${mentionText}`
        : `${messageTitle}\n${urlText}`;

      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText }),
      });

      if (!webhookResponse.ok) {
        const errorPayload = await webhookResponse.text();
        res.status(500).json({ error: `Google Chat webhook error: ${errorPayload}` });
        return;
      }

      const webhookJson = (await webhookResponse.json().catch(() => null)) as
        | { name?: string; thread?: { name?: string }; space?: { name?: string } }
        | null;

      // Webhookレスポンスをログに出力（デバッグ用）
      console.info('First webhook response:', JSON.stringify(webhookJson, null, 2));
      console.info('Space base URL:', spaceBaseUrl);

      const firstMessageName = webhookJson?.name || null;
      const threadName = webhookJson?.thread?.name || null;

      // スレッドに2つ目のメッセージを送信してスレッドを確実に開けるようにする
      // Stack Overflowの情報に基づき、threadKeyとmessageReplyOptionをクエリパラメータとして追加する方法を実装
      // 参考: https://stackoverflow.com/questions/67111540/how-do-you-respond-to-a-thread-in-google-chat-from-an-incoming-webhook
      let finalMessageName = firstMessageName;
      if (threadName) {
        try {
          // threadNameからthreadIdを抽出
          // threadNameの形式: "spaces/{spaceId}/threads/{threadId}"
          const threadIdMatch = threadName.match(/threads\/([^?]+)/);
          if (!threadIdMatch) {
            console.warn('Failed to extract threadId from threadName:', threadName);
          } else {
            const threadId = threadIdMatch[1];

            // Webhook URLにthreadKeyとmessageReplyOptionをクエリパラメータとして追加
            // messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD により、
            // スレッドが存在する場合は返信し、存在しない場合は新しいスレッドを作成
            const separator = webhookUrl.includes('?') ? '&' : '?';
            const webhookUrlWithParams = `${webhookUrl}${separator}threadKey=${threadId}&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`;

            console.info('Sending second message to thread:', {
              threadId,
              threadName,
              webhookUrl: webhookUrlWithParams,
            });

            // threadKeyとmessageReplyOptionを使用してスレッドに返信
            const secondMessageResponse = await fetch(webhookUrlWithParams, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: 'スレッド開始',
              }),
            });

            if (secondMessageResponse.ok) {
              const secondMessageJson = (await secondMessageResponse.json().catch(() => null)) as
                | { name?: string; thread?: { name?: string } }
                | null;

              console.info('Second webhook response:', JSON.stringify(secondMessageJson, null, 2));

              // 2つ目のメッセージが同じスレッドに送信されたか確認
              const secondThreadName = secondMessageJson?.thread?.name;
              if (secondThreadName === threadName) {
                // 同じスレッドに送信された場合、2つ目のメッセージのnameを使用
                if (secondMessageJson?.name) {
                  finalMessageName = secondMessageJson.name;
                  console.info('Using second message name for URL (same thread):', finalMessageName);
                }
              } else {
                console.warn('Second message created a new thread:', {
                  expectedThread: threadName,
                  actualThread: secondThreadName,
                  threadId,
                });
                // 新しいスレッドが作成された場合、最初のメッセージのURLを使用
              }
            } else {
              const errorText = await secondMessageResponse.text().catch(() => 'Unknown error');
              console.warn('Failed to send second message to thread:', {
                status: secondMessageResponse.status,
                statusText: secondMessageResponse.statusText,
                error: errorText,
                threadId,
                threadName,
              });
            }
          }
        } catch (error) {
          console.error('Error sending second message to thread:', error);
          // エラーが発生しても最初のメッセージのURLを使用する
        }
      }

      const threadUrl = buildThreadUrl(spaceBaseUrl, finalMessageName, threadName);

      console.info('Built thread URL:', threadUrl);

      await db
        .collection('projects')
        .doc(projectId)
        .collection('tasks')
        .doc(taskId)
        .update({
          googleChatThreadUrl: threadUrl,
          updatedAt: new Date(),
        });

      res.status(200).json({ success: true, url: threadUrl, messageName: finalMessageName });
    } catch (error) {
      console.error('createGoogleChatThread error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
