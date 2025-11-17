import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const db = getFirestore();
const secretClient = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GCLOUD_PROJECT || '';
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  return version.payload?.data?.toString() || '';
}

export const createDriveFolder = onRequest(
  {
    cors: true,
    maxInstances: 10,
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
      // リクエストボディからuserIdを取得
      const userId = req.body?.userId;
      if (!userId) {
        res.status(400).json({ error: 'Missing userId in request body' });
        return;
      }

      // Firebase Functions v2では、req.pathは関数のルートからの相対パス
      // 例: /projects/{projectId}/tasks/{taskId}
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

      // ユーザーのリフレッシュトークンを取得
      console.info('Fetching user document for userId:', userId);
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        console.error('User document not found for userId:', userId);
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userData = userDoc.data();
      console.info('User data fields:', userData ? Object.keys(userData) : 'null');
      console.info('googleRefreshToken exists:', !!userData?.googleRefreshToken);
      const refreshToken = userData?.googleRefreshToken;

      if (!refreshToken) {
        console.error('Refresh token not found for userId:', userId);
        console.error('Available fields:', userData ? Object.keys(userData).join(', ') : 'none');
        res.status(400).json({
          error: 'Google Drive認証が必要です。設定ページでGoogle Driveと連携してください。',
          requiresAuth: true,
        });
        return;
      }

      console.info('Refresh token found, length:', refreshToken.length);

      // タスク情報取得
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

      // 既存フォルダを検索
      // フォルダ名の構成: issueKey + タイトル（backlogProjectKeyは使用しない）
      const parts: string[] = [];
      if (task.external?.issueKey) {
        parts.push(task.external.issueKey);
      }
      parts.push(task.title);
      const folderName = parts.join(' ');

      // Secrets取得
      const oauthClientId = await getSecret('GOOGLE_OAUTH_CLIENT_ID');
      const oauthClientSecret = await getSecret('GOOGLE_OAUTH_CLIENT_SECRET');
      const driveParentId = await getSecret('DRIVE_PARENT_ID');
      const checksheetTemplateId = await getSecret('CHECKSHEET_TEMPLATE_ID');

      if (!oauthClientId || !oauthClientSecret || !driveParentId || !checksheetTemplateId) {
        res.status(500).json({
          error:
            'Failed to retrieve secrets. Please configure GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, DRIVE_PARENT_ID, and CHECKSHEET_TEMPLATE_ID in Secret Manager.',
        });
        return;
      }

      // OAuth 2.0クライアントを作成してリフレッシュトークンからアクセストークンを取得
      const oauth2Client = new google.auth.OAuth2(
        oauthClientId,
        oauthClientSecret,
        // リダイレクトURIは使用しないが、OAuth2Clientのコンストラクタに必要
        'urn:ietf:wg:oauth:2.0:oob'
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      // アクセストークンを取得（必要に応じて自動的にリフレッシュされる）
      const accessToken = await oauth2Client.getAccessToken();
      if (!accessToken.token) {
        res.status(401).json({
          error: 'Google Drive認証トークンの取得に失敗しました。設定ページで再認証してください。',
          requiresAuth: true,
        });
        return;
      }

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // 親フォルダが共有ドライブかどうかを確認
      const parentFolder = await drive.files.get({
        fileId: driveParentId,
        fields: 'id, name, driveId',
        supportsAllDrives: true,
      });

      const isSharedDrive = !!parentFolder.data.driveId;
      const driveId = parentFolder.data.driveId || undefined;

      // 同名フォルダ検索
      const searchResponse = await drive.files.list({
        q: `name='${folderName.replace(/'/g, "\\'")}' and parents in '${driveParentId}' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: isSharedDrive ? 'drive' : 'user',
        driveId: isSharedDrive ? driveId : undefined,
      });

      let folderId: string;
      let folderUrl: string;

      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        // 既存フォルダを使用
        folderId = searchResponse.data.files[0].id!;
        folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
      } else {
        // 新規フォルダ作成
        const folderResponse = await drive.files.create({
          requestBody: {
            name: folderName,
            parents: [driveParentId],
            mimeType: 'application/vnd.google-apps.folder',
          },
          fields: 'id',
          supportsAllDrives: true,
        });

        folderId = folderResponse.data.id!;
        folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

        // チェックシートテンプレートを複製
        let checksheetError: Error | null = null;
        let sheetId: string | null = null;
        try {
          const checksheetName = `チェックシート_${task.title}`;
          console.info('Creating checksheet with name:', checksheetName);

          const copyResponse = await drive.files.copy({
            fileId: checksheetTemplateId,
            requestBody: {
              name: checksheetName,
              parents: [folderId],
            },
            supportsAllDrives: true,
          });

          sheetId = copyResponse.data.id!;
          console.info('Checksheet created successfully, ID:', sheetId);

          const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

          // シート名を取得
          const spreadsheetInfo = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
          });
          const firstSheet = spreadsheetInfo.data.sheets?.[0];
          const sheetName = firstSheet?.properties?.title || 'シート1';
          console.info('Sheet name:', sheetName);

          // セル書き込み（個別にエラーハンドリング）
          try {
            await sheets.spreadsheets.values.update({
              spreadsheetId: sheetId,
              range: `${sheetName}!C4`,
              valueInputOption: 'RAW',
              requestBody: {
                values: [[task.title]],
              },
            });
            console.info('Cell C4 updated successfully');
          } catch (error) {
            console.error('Failed to update cell C4:', error);
            throw error;
          }

          try {
            await sheets.spreadsheets.values.update({
              spreadsheetId: sheetId,
              range: `${sheetName}!C5`,
              valueInputOption: 'RAW',
              requestBody: {
                values: [[task.external?.url || '']],
              },
            });
            console.info('Cell C5 updated successfully');
          } catch (error) {
            console.error('Failed to update cell C5:', error);
            throw error;
          }

          try {
            await sheets.spreadsheets.values.update({
              spreadsheetId: sheetId,
              range: `${sheetName}!C7`,
              valueInputOption: 'RAW',
              requestBody: {
                values: [[folderUrl]],
              },
            });
            console.info('Cell C7 updated successfully');
          } catch (error) {
            console.error('Failed to update cell C7:', error);
            throw error;
          }

          console.info('All cells updated successfully');
        } catch (error) {
          // チェックシート作成でエラーが発生した場合、エラー情報を保存
          checksheetError = error instanceof Error ? error : new Error(String(error));
          console.error('チェックシートの作成に失敗しました:', {
            error: checksheetError.message,
            stack: checksheetError.stack,
            checksheetTemplateId,
            folderId,
            taskTitle: task.title,
            sheetId,
          });

          // Google APIエラーの場合は詳細情報を取得
          if (error && typeof error === 'object' && 'response' in error) {
            const apiError = error as any;
            console.error('Google API Error:', {
              status: apiError.response?.status,
              statusText: apiError.response?.statusText,
              data: apiError.response?.data,
            });
          }
        }

        // タスクにURLを保存
        await db.collection('projects').doc(projectId).collection('tasks').doc(taskId)
          .update({
            googleDriveUrl: folderUrl,
            updatedAt: new Date(),
          });

        // チェックシート作成エラーがある場合は警告付きで返す
        if (checksheetError) {
          res.status(200).json({
            success: true,
            url: folderUrl,
            warning: 'チェックシートの作成に失敗しました',
            error: checksheetError.message,
          });
          return;
        }

        res.status(200).json({
          success: true,
          url: folderUrl,
        });
      }

      // 既存フォルダの場合もURLを保存
      await db.collection('projects').doc(projectId).collection('tasks').doc(taskId)
        .update({
          googleDriveUrl: folderUrl,
          updatedAt: new Date(),
        });

      res.status(200).json({
        success: true,
        url: folderUrl,
      });
    } catch (error) {
      console.error('Create Drive folder error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
