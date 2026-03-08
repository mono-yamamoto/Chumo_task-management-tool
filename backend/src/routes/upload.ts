import { Hono } from 'hono';
import type { Env } from '../index';
import type { Database } from '../db';

type UploadEnv = Env & { Variables: { db: Database; userId: string } };

const app = new Hono<UploadEnv>();

/**
 * POST /
 * 画像ファイルをR2にアップロード
 * Content-Type: multipart/form-data
 * - file: アップロードするファイル
 * - path: 保存先パス (e.g. "comments/projectType/taskId")
 */
app.post('/', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const pathPrefix = (body['path'] as string) || 'uploads';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file provided' }, 400);
  }

  // パストラバーサル防止
  if (
    pathPrefix.includes('..') ||
    pathPrefix.startsWith('/') ||
    pathPrefix.includes('\0') ||
    pathPrefix.includes('\\')
  ) {
    return c.json({ error: 'Invalid path' }, 400);
  }

  // MIMEタイプ制限（画像のみ許可）
  const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return c.json({ error: `File type not allowed: ${file.type}` }, 400);
  }

  // ファイル名をユニークにする
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split('.').pop() || 'png';
  const fileName = `${timestamp}-${randomStr}.${extension}`;
  const key = `${pathPrefix}/${fileName}`;

  const bucket = c.env.UPLOAD_BUCKET;
  if (!bucket) {
    return c.json({ error: 'Storage not configured' }, 500);
  }

  const arrayBuffer = await file.arrayBuffer();
  await bucket.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  });

  // R2ファイル配信URL
  const apiBase = c.env.APP_ORIGIN || 'http://localhost:8787';
  const url = `${apiBase}/api/files/${key}`;

  return c.json({ url, key });
});

export default app;
