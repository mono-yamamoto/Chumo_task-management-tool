/**
 * Google Drive / Sheets API ヘルパー
 * Cloudflare Workers 環境向け（fetch + Web Crypto API のみ使用）
 */

// --- OAuth ---

/**
 * Google OAuth2 リフレッシュトークンからアクセストークンを取得
 */
export async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new globalThis.URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token || null;
}

// --- Drive API ---

/**
 * Drive API: ファイル情報取得
 */
export async function driveGetFile(
  accessToken: string,
  fileId: string
): Promise<{ id: string; name: string; driveId?: string } | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,driveId&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  return (await res.json()) as { id: string; name: string; driveId?: string };
}

/**
 * Drive API: ファイル検索
 */
export async function driveSearchFiles(
  accessToken: string,
  query: string,
  driveId?: string
): Promise<{ id: string; name: string }[]> {
  const params = new globalThis.URLSearchParams({
    q: query,
    fields: 'files(id,name)',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    corpora: driveId ? 'drive' : 'user',
  });
  if (driveId) params.set('driveId', driveId);

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { files?: { id: string; name: string }[] };
  return data.files || [];
}

/**
 * Drive API: フォルダ作成
 */
export async function driveCreateFolder(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string | null> {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        parents: [parentId],
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Drive API: ファイルコピー
 */
export async function driveCopyFile(
  accessToken: string,
  fileId: string,
  name: string,
  parentId: string,
  mimeType?: string
): Promise<string | null> {
  const body: Record<string, unknown> = { name, parents: [parentId] };
  if (mimeType) body.mimeType = mimeType;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/copy?supportsAllDrives=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Drive API: スプレッドシートを直接フォルダ内に新規作成
 */
export async function driveCreateSpreadsheet(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string | null> {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        parents: [parentId],
        mimeType: 'application/vnd.google-apps.spreadsheet',
      }),
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Drive API: フォルダ内のファイル一覧取得
 */
export async function driveListFilesInFolder(
  accessToken: string,
  folderId: string,
  mimeType?: string
): Promise<{ id: string; name: string }[]> {
  let query = `'${folderId}' in parents and trashed=false`;
  if (mimeType) {
    query += ` and mimeType='${mimeType}'`;
  }
  return driveSearchFiles(accessToken, query);
}

// --- Sheets API ---

/**
 * Sheets API: セル書き込み（単一セル）
 */
export async function sheetsUpdateCell(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  value: string
): Promise<boolean> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [[value]] }),
    }
  );
  return res.ok;
}

/**
 * Sheets API: シート名取得
 */
export async function sheetsGetSheetName(
  accessToken: string,
  spreadsheetId: string
): Promise<string> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return 'シート1';
  const data = (await res.json()) as {
    sheets?: { properties?: { title?: string } }[];
  };
  return data.sheets?.[0]?.properties?.title || 'シート1';
}

/**
 * Sheets API: 範囲一括書き込み
 */
export async function sheetsUpdateValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: (string | number)[][],
  valueInputOption: 'RAW' | 'USER_ENTERED' = 'USER_ENTERED'
): Promise<boolean> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  return res.ok;
}

/**
 * Sheets API: 書式一括適用（batchUpdate）
 */
export async function sheetsBatchUpdate(
  accessToken: string,
  spreadsheetId: string,
  requests: Record<string, unknown>[]
): Promise<boolean> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );
  return res.ok;
}

/**
 * Sheets API: シートクリア（上書き用）
 */
export async function sheetsClearValues(
  accessToken: string,
  spreadsheetId: string,
  range: string = 'A:Z'
): Promise<boolean> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );
  return res.ok;
}
