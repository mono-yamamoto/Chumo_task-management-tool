import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://chumo:chumo_dev@localhost:5432/chumo_dev';

/**
 * テスト用DB接続を作成する
 * postgres-js ドライバを使用（ローカル/CI環境向け）
 */
export function createTestDb() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });
  return { db, client };
}

/**
 * 全テーブルのデータを削除する（テスト間のクリーンアップ用）
 * FK制約の順序を考慮して削除
 */
export async function cleanDatabase(db: ReturnType<typeof createTestDb>['db']) {
  await db.delete(schema.taskActivities);
  await db.delete(schema.taskComments);
  await db.delete(schema.taskSessions);
  await db.delete(schema.taskExternals);
  await db.delete(schema.tasks);
  await db.delete(schema.labels);
  await db.delete(schema.contacts);
  await db.delete(schema.projects);
  await db.delete(schema.users);
}
