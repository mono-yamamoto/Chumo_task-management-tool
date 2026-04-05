import { Hono } from 'hono';
import { z } from 'zod/v4';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { tasks, taskExternals, users } from '../db/schema';
import {
  getAccessToken,
  driveGetFile,
  driveSearchFiles,
  driveCreateFolder,
  driveCopyFile,
  sheetsUpdateCell,
  sheetsGetSheetName,
} from '../lib/google-api';
import type { Env } from '../index';
import type { Database } from '../db';

type DriveEnv = Env & {
  Variables: { db: Database; userId: string };
};

const app = new Hono<DriveEnv>();

// --- OAuth HMAC署名ヘルパー（Web Crypto API） ---

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10分

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function verifyHmac(secret: string, data: string, signatureB64: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );
    return await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  } catch {
    return false;
  }
}

function buildOAuthState(userId: string, ts: number, sig: string): string {
  return btoa(JSON.stringify({ userId, ts, sig }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function parseOAuthState(state: string): { userId: string; ts: number; sig: string } | null {
  try {
    const padded = state.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    const parsed = JSON.parse(json);
    if (
      typeof parsed.userId === 'string' &&
      typeof parsed.ts === 'number' &&
      typeof parsed.sig === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// --- OAuth エンドポイント ---

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

/**
 * GET /auth-url
 * Google OAuth認証URLを生成して返却
 */
app.get('/auth-url', async (c) => {
  const userId = c.get('userId');
  const clientId = c.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return c.json({ error: 'OAuth configuration is incomplete' }, 500);
  }

  // redirect_uri をリクエストURLから動的構築
  const url = new URL(c.req.url);
  const redirectUri = `${url.protocol}//${url.host}/api/drive/callback`;

  // HMAC署名付き state パラメータ生成
  const ts = Date.now();
  const sig = await hmacSign(clientSecret, `${userId}:${ts}`);
  const state = buildOAuthState(userId, ts, sig);

  const params = new globalThis.URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OAUTH_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return c.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

/**
 * GET /callback
 * Google OAuthコールバック処理（認証不要 — SKIP_PATHSで除外）
 * code → refresh_token交換 → DB保存 → フロントにリダイレクト
 */
app.get('/callback', async (c) => {
  const db = c.get('db');
  const code = c.req.query('code');
  const stateParam = c.req.query('state');
  const error = c.req.query('error');
  const appOrigin = c.env.APP_ORIGIN;
  const clientId = c.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_OAUTH_CLIENT_SECRET;

  const errorRedirect = (msg: string) =>
    c.redirect(
      `${appOrigin}/settings?tab=integrations&drive=error&message=${encodeURIComponent(msg)}`
    );

  if (error) {
    return errorRedirect(
      error === 'access_denied' ? 'Google認証が拒否されました' : `OAuth error: ${error}`
    );
  }

  if (!code || !stateParam || !clientId || !clientSecret) {
    return errorRedirect('不正なリクエストです');
  }

  // state パラメータ検証
  const state = parseOAuthState(stateParam);
  if (!state) {
    return errorRedirect('不正なstateパラメータです');
  }

  // タイムスタンプ検証
  if (Date.now() - state.ts > STATE_MAX_AGE_MS) {
    return errorRedirect('認証リクエストが期限切れです。再度お試しください');
  }

  // HMAC署名検証
  const valid = await verifyHmac(clientSecret, `${state.userId}:${state.ts}`, state.sig);
  if (!valid) {
    return errorRedirect('署名検証に失敗しました');
  }

  // redirect_uri をリクエストURLから動的構築
  const url = new URL(c.req.url);
  const redirectUri = `${url.protocol}//${url.host}/api/drive/callback`;

  // code → token 交換
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new globalThis.URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return errorRedirect('トークン交換に失敗しました');
  }

  const tokenData = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
  if (!tokenData.refresh_token) {
    return errorRedirect('リフレッシュトークンが取得できませんでした');
  }

  // DB に refresh_token 保存
  await db
    .update(users)
    .set({
      googleRefreshToken: tokenData.refresh_token,
      googleOAuthUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, state.userId));

  return c.redirect(`${appOrigin}/settings?tab=integrations&drive=connected`);
});

// --- Drive / Sheets ヘルパー ---

const createFolderSchema = z.object({
  taskId: z.string(),
});

/**
 * POST /folders
 * Google Driveフォルダ作成 + チェックシートテンプレート複製
 */
app.post('/folders', zValidator('json', createFolderSchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  const { taskId } = c.req.valid('json');

  // タスク取得
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  // 既にDriveフォルダが作成済み
  if (task.googleDriveUrl) {
    return c.json({ success: true, url: task.googleDriveUrl, alreadyExists: true });
  }

  // ユーザーのリフレッシュトークン取得
  const [user] = await db
    .select({ googleRefreshToken: users.googleRefreshToken })
    .from(users)
    .where(eq(users.id, userId));

  if (!user?.googleRefreshToken) {
    return c.json(
      {
        error: 'Google Drive認証が必要です。設定ページでGoogle Driveと連携してください。',
        requiresAuth: true,
      },
      400
    );
  }

  // 環境変数から設定取得
  const clientId = c.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const driveParentId = c.env.DRIVE_PARENT_ID;
  const checksheetTemplateId = c.env.CHECKSHEET_TEMPLATE_ID;
  const appOrigin = c.env.APP_ORIGIN;

  if (!clientId || !clientSecret || !driveParentId || !checksheetTemplateId) {
    return c.json({ error: 'Drive configuration is incomplete' }, 500);
  }

  // アクセストークン取得
  const accessToken = await getAccessToken(clientId, clientSecret, user.googleRefreshToken);
  if (!accessToken) {
    return c.json(
      {
        error: 'Google Drive認証トークンの取得に失敗しました。設定ページで再認証してください。',
        requiresAuth: true,
      },
      401
    );
  }

  // 外部連携情報を取得（フォルダ名構築用）
  const [external] = await db.select().from(taskExternals).where(eq(taskExternals.taskId, taskId));

  // フォルダ名構築
  const parts: string[] = [];
  const titleStartsWithIssueKey = external?.issueKey && task.title.startsWith(external.issueKey);
  if (external?.issueKey && !titleStartsWithIssueKey) {
    parts.push(external.issueKey);
  }
  parts.push(task.title);
  const folderName = parts.join(' ');

  // 親フォルダ情報取得
  const parentFolder = await driveGetFile(accessToken, driveParentId);
  const driveId = parentFolder?.driveId || undefined;

  // 同名フォルダ検索
  const escapedName = folderName.replace(/'/g, "\\'");
  const existingFiles = await driveSearchFiles(
    accessToken,
    `name='${escapedName}' and parents in '${driveParentId}' and trashed=false`,
    driveId
  );

  let folderId: string;
  let folderUrl: string;

  if (existingFiles.length > 0) {
    folderId = existingFiles[0].id;
    folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
  } else {
    // 新規フォルダ作成
    const newFolderId = await driveCreateFolder(accessToken, folderName, driveParentId);
    if (!newFolderId) {
      return c.json({ error: 'Failed to create Drive folder' }, 500);
    }
    folderId = newFolderId;
    folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

    // チェックシートテンプレートを複製
    let checksheetWarning: string | undefined;
    const sheetId = await driveCopyFile(
      accessToken,
      checksheetTemplateId,
      `チェックシート_${task.title}`,
      folderId
    );

    if (sheetId) {
      const sheetName = await sheetsGetSheetName(accessToken, sheetId);

      // セル書き込み
      await sheetsUpdateCell(accessToken, sheetId, `${sheetName}!C4`, task.title);
      await sheetsUpdateCell(accessToken, sheetId, `${sheetName}!C5`, external?.url || '');
      await sheetsUpdateCell(accessToken, sheetId, `${sheetName}!C7`, folderUrl);

      const taskDetailUrl = appOrigin ? `${appOrigin}/tasks/${taskId}` : '';
      if (taskDetailUrl) {
        await sheetsUpdateCell(accessToken, sheetId, `${sheetName}!H9`, taskDetailUrl);
      }
    } else {
      checksheetWarning = 'チェックシートの作成に失敗しました';
    }

    // タスクにURLを保存
    await db
      .update(tasks)
      .set({ googleDriveUrl: folderUrl, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    if (checksheetWarning) {
      return c.json({ success: true, url: folderUrl, warning: checksheetWarning });
    }
    return c.json({ success: true, url: folderUrl });
  }

  // 既存フォルダの場合もURLを保存
  await db
    .update(tasks)
    .set({ googleDriveUrl: folderUrl, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  return c.json({ success: true, url: folderUrl });
});

export default app;
