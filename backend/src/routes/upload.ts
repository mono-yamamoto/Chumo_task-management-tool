import { Hono } from 'hono';
import { generateSignedFileUrl } from '../lib/crypto';
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

  // MIMEタイプ制限（ラスター画像のみ許可、SVGはスクリプト埋め込み可能なため除外）
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return c.json({ error: `File type not allowed: ${file.type}` }, 400);
  }

  // ファイル名をUUIDで推測困難にする
  const extension = file.name.split('.').pop() || 'png';
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const key = `${pathPrefix}/${fileName}`;

  const bucket = c.env.UPLOAD_BUCKET;
  if (!bucket) {
    return c.json({ error: 'Storage not configured' }, 500);
  }

  const arrayBuffer = await file.arrayBuffer();
  await bucket.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  });

  // 署名付きファイルURL を生成（24時間有効）
  const apiBase = c.env.APP_ORIGIN || 'http://localhost:8787';
  const url = await generateSignedFileUrl(apiBase, key, c.env.INTERNAL_API_KEY);

  return c.json({ url, key });
});

export default app;
