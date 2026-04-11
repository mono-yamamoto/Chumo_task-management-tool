import { createMiddleware } from 'hono/factory';
import { verifyToken } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import type { Env } from '../index';
import type { Database } from '../db';

// prefix一致でスキップするパス
const SKIP_PREFIX_PATHS = ['/api/files/'];
// Webhookパス（Clerk認証はスキップし、ルート側で独自検証を行う）
const WEBHOOK_PREFIX_PATHS = ['/api/backlog/webhook'];
// 完全一致でスキップするパス（クエリパラメータは無視）
const SKIP_EXACT_PATHS = ['/api/drive/callback'];
// isAllowed チェックをスキップするパス（ID移行フローで未登録ユーザーがアクセスする）
const SKIP_ALLOWED_CHECK_PATHS = ['/api/users/me'];

/**
 * isAllowed チェック共通処理
 * usersテーブルに行が存在し、isAllowed=true であることを確認
 */
async function checkUserAllowed(db: Database, userId: string): Promise<'allowed' | 'forbidden'> {
  const [user] = await db
    .select({ isAllowed: users.isAllowed })
    .from(users)
    .where(eq(users.id, userId));

  if (!user || !user.isAllowed) {
    return 'forbidden';
  }
  return 'allowed';
}

/**
 * Clerk JWT検証ミドルウェア
 * Authorization: Bearer <token> からユーザーIDを抽出して c.set('userId', ...) にセット
 * サーバー間通信用に X-Internal-Key + X-Internal-User-Id ヘッダーも受け付ける
 * isAllowed=false または行が存在しないユーザーは拒否する
 */
export const authMiddleware = createMiddleware<
  Env & { Variables: { userId: string; db: Database } }
>(async (c, next) => {
  const path = c.req.path;
  if (SKIP_PREFIX_PATHS.some((p) => path.startsWith(p)) || SKIP_EXACT_PATHS.includes(path)) {
    return next();
  }

  // Webhook: Clerk認証はスキップ、ルート側で独自検証を行う
  if (WEBHOOK_PREFIX_PATHS.some((p) => path.startsWith(p))) {
    return next();
  }

  const skipAllowedCheck = SKIP_ALLOWED_CHECK_PATHS.includes(path);

  // サーバー間通信（内部APIキー認証）
  const internalKey = c.req.header('X-Internal-Key');
  const internalUserId = c.req.header('X-Internal-User-Id');
  if (
    internalKey &&
    internalUserId &&
    c.env.INTERNAL_API_KEY &&
    internalKey === c.env.INTERNAL_API_KEY
  ) {
    if (!skipAllowedCheck) {
      const db = c.get('db');
      if ((await checkUserAllowed(db, internalUserId)) === 'forbidden') {
        return c.json({ error: 'Forbidden' }, 403);
      }
    }
    c.set('userId', internalUserId);
    return await next();
  }

  // Clerk JWT認証
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);

  // verifyToken のみ catch（DB参照/下流ハンドラの例外はグローバルエラーハンドラに委譲）
  let userId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    });
    userId = payload.sub;
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // isAllowed チェック（/me はID移行フローがあるためスキップ）
  if (!skipAllowedCheck) {
    const db = c.get('db');
    if ((await checkUserAllowed(db, userId)) === 'forbidden') {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }

  c.set('userId', userId);
  await next();
});
