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

function buildThreadUrl(spaceBaseUrl: string, messageName?: string | null): string {
  const sanitizedBase = spaceBaseUrl.replace(/\/+$/, '');
  if (!messageName) {
    return sanitizedBase;
  }

  const parts = messageName.split('/');
  const messageId = parts[parts.length - 1];
  if (!messageId) {
    return sanitizedBase;
  }

  return `${sanitizedBase}/${encodeURIComponent(messageId)}`;
}

export const createGoogleChatThread = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
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

      const taskUrl: unknown = req.body?.taskUrl;
      if (typeof taskUrl !== 'string' || taskUrl.trim().length === 0) {
        res.status(400).json({ error: 'taskUrl is required in request body' });
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

      const assigneeIds: string[] = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
      const assignees: string[] = [];

      for (const userId of assigneeIds) {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.displayName) {
            assignees.push(userData.displayName);
          }
        }
      }

      const assigneeText = assignees.length > 0 ? assignees.join(', ') : '担当者未設定';
      const messageTitle = typeof task.title === 'string' ? task.title : 'タスク';
      const messageText = `[${messageTitle}](${taskUrl})\n${assigneeText}`;

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
        | { name?: string }
        | null;
      const messageName = webhookJson?.name || null;
      const threadUrl = buildThreadUrl(spaceBaseUrl, messageName);

      await db
        .collection('projects')
        .doc(projectId)
        .collection('tasks')
        .doc(taskId)
        .update({
          googleChatThreadUrl: threadUrl,
          updatedAt: new Date(),
        });

      res.status(200).json({ success: true, url: threadUrl, messageName });
    } catch (error) {
      console.error('createGoogleChatThread error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
