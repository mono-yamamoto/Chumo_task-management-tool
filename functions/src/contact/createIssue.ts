import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { Octokit } from '@octokit/rest';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { ErrorReportDetails } from '../types';

interface CreateContactIssueRequestBody {
  contactId: string;
  type: 'error' | 'feature' | 'other';
  title: string;
  content?: string;
  userName: string;
  userEmail: string;
  errorReportDetails?: ErrorReportDetails;
}

const db = getFirestore();
const secretClient = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GCLOUD_PROJECT || '';
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  return version.payload?.data?.toString() || '';
}

function getContactTypeLabel(type: string): string {
  switch (type) {
    case 'error':
      return 'エラー報告';
    case 'feature':
      return '要望';
    case 'other':
      return 'そのほか';
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
    case 'other':
      return 'question';
    default:
      return 'question';
  }
}

export const createContactIssue = onRequest(
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

    // OPTIONSリクエスト（preflight）に対応
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const body = (req.body ?? {}) as Partial<CreateContactIssueRequestBody>;
      const { contactId, type, title, content, userName, userEmail, errorReportDetails } = body;

      if (!contactId || !type || !title) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // エラー報告以外の場合、contentは必須
      if (type !== 'error' && !content) {
        res.status(400).json({ error: 'Content is required for non-error contacts' });
        return;
      }

      // GitHubトークン取得
      const githubToken = await getSecret('GITHUB_TOKEN');
      if (!githubToken) {
        res.status(500).json({ error: 'Failed to retrieve GitHub token' });
        return;
      }
      const octokit = new Octokit({ auth: githubToken });

      // Issue作成
      const typeLabel = getContactTypeLabel(type);
      const issueTitle = `[${typeLabel}] ${title}`;

      let issueBody = '';
      if (type === 'error' && errorReportDetails) {
        // エラー報告の場合、詳細情報を含める
        const envLines = [`- デバイス: ${errorReportDetails.environment.device}`];

        if (errorReportDetails.environment.device === 'PC') {
          envLines.push(`- OS: ${errorReportDetails.environment.os}`);
          if (errorReportDetails.environment.osVersion) {
            envLines.push(`- OSのバージョン: ${errorReportDetails.environment.osVersion}`);
          }
        } else {
          envLines.push(`- スマホの種類: ${errorReportDetails.environment.os}`);
          if (errorReportDetails.environment.osVersion) {
            envLines.push(`- スマホのバージョン: ${errorReportDetails.environment.osVersion}`);
          }
        }

        envLines.push(`- ブラウザ: ${errorReportDetails.environment.browser}`);
        if (errorReportDetails.environment.browserVersion) {
          envLines.push(`- ブラウザのバージョン: ${errorReportDetails.environment.browserVersion}`);
        }
        if (errorReportDetails.screenshotUrl) {
          envLines.push(`- スクリーンショット: ${errorReportDetails.screenshotUrl}`);
        }

        issueBody = [
          `**お問い合わせの種類**: ${typeLabel}`,
          `**送信者**: ${userName} (${userEmail})`,
          `**お問い合わせID**: ${contactId}`,
          '',
          '---',
          '',
          '## 事象',
          errorReportDetails.issue,
          '',
          '## 再現方法',
          errorReportDetails.reproductionSteps,
          '',
          '## 環境',
          ...envLines,
          '',
          '---',
          '',
          content ? `**その他の情報**:\n${content}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      } else {
        // その他のお問い合わせの場合
        issueBody = [
          `**お問い合わせの種類**: ${typeLabel}`,
          `**送信者**: ${userName} (${userEmail})`,
          `**お問い合わせID**: ${contactId}`,
          '',
          '---',
          '',
          '**内容**:',
          content || '',
        ]
          .filter(Boolean)
          .join('\n');
      }

      const issueResponse = await octokit.rest.issues.create({
        owner: 'mono-yamamoto',
        repo: 'Chumo_task-management-tool',
        title: issueTitle,
        body: issueBody,
        labels: [getContactTypeLabelForGitHub(type)],
      });

      const issueUrl = issueResponse.data.html_url;

      // お問い合わせにURLを保存
      await db.collection('contacts').doc(contactId).update({
        githubIssueUrl: issueUrl,
        updatedAt: new Date(),
      });

      res.status(200).json({
        success: true,
        url: issueUrl,
      });
    } catch (error) {
      console.error('Create contact issue error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
