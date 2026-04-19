import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import postgres from 'postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

/**
 * リクエストごとにDB接続を作成する関数
 * - localhost → postgres-js (TCP) ドライバー
 * - それ以外 → @neondatabase/serverless (HTTP) ドライバー
 *
 * 戻り値型は NeonHttpDatabase に統一（API互換性あり）
 */
export function createDb(databaseUrl: string): NeonHttpDatabase<typeof schema> {
  if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
    const client = postgres(databaseUrl);
    return drizzlePg(client, { schema }) as unknown as NeonHttpDatabase<typeof schema>;
  }
  const sql = neon(databaseUrl);
  return drizzleNeon(sql, { schema });
}

export type Database = NeonHttpDatabase<typeof schema>;
