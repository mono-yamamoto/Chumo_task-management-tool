/**
 * Firestore → Neon (PostgreSQL) データ移行スクリプト
 *
 * 前提条件:
 * - Firebase Admin SDK 認証情報が .env.local に設定済み
 * - Neon (または local PostgreSQL) の DATABASE_URL が .env.local に設定済み
 * - backend/src/db/migrations が Neon に適用済み
 *
 * 実行:
 *   npx tsx scripts/migrate-firestore-to-neon.ts
 *
 * 環境変数:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   DATABASE_URL (Neon or local PostgreSQL)
 *   DRY_RUN=true (実際には書き込まない、デフォルト: false)
 *   SKIP_COLLECTIONS=users,labels (スキップするコレクション、カンマ区切り)
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore, Timestamp } from 'firebase-admin/firestore';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import postgres from 'postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

// .env.local を読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

// --- Config ---

const DRY_RUN = process.env.DRY_RUN === 'true';
const SKIP_COLLECTIONS = (process.env.SKIP_COLLECTIONS || '').split(',').filter(Boolean);
const BATCH_SIZE = 100; // PostgreSQL INSERT のバッチサイズ

// --- 型定義 ---

type ProjectType =
  | 'REG2017'
  | 'BRGREG'
  | 'MONO'
  | 'MONO_ADMIN'
  | 'DES_FIRE'
  | 'DesignSystem'
  | 'DMREG2'
  | 'monosus'
  | 'PRREG';

const PROJECT_TYPES: ProjectType[] = [
  'REG2017',
  'BRGREG',
  'MONO',
  'MONO_ADMIN',
  'DES_FIRE',
  'DesignSystem',
  'DMREG2',
  'monosus',
  'PRREG',
];

// --- ユーティリティ ---

/** Firestore Timestamp → Date 変換（null安全） */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'object' && value !== null && '_seconds' in value) {
    const ts = value as { _seconds: number; _nanoseconds: number };
    return new Date(ts._seconds * 1000 + ts._nanoseconds / 1e6);
  }
  return null;
}

/** Firestore Timestamp → Date 変換（必須フィールド） */
function toDateRequired(value: unknown): Date {
  const result = toDate(value);
  if (!result) throw new Error(`Required date field is null: ${JSON.stringify(value)}`);
  return result;
}

/** 配列を指定サイズのチャンクに分割 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/** 安全な文字列配列変換 */
function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [];
}

// --- 集計結果 ---

const stats: Record<string, { firestore: number; neon: number; errors: number }> = {};

function initStats(collection: string) {
  stats[collection] = { firestore: 0, neon: 0, errors: 0 };
}

// --- Firebase 初期化 ---

function initFirebase(): Firestore {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local'
    );
  }

  const app: App = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return getFirestore(app);
}

// --- Neon 初期化 ---

// postgres-js 使用時のクライアント参照（終了時に明示 close する用）
let postgresClient: ReturnType<typeof postgres> | null = null;

function initNeon() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in .env.local');
  }

  // localhost はNeon HTTP APIに到達できないのでpostgres-js(TCP)に切り替える
  if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
    postgresClient = postgres(databaseUrl);
    return drizzlePg(postgresClient);
  }

  const queryFn = neon(databaseUrl);
  return drizzle(queryFn);
}

// --- 移行関数 ---

/** users コレクション */
async function migrateUsers(fsDb: Firestore, db: ReturnType<typeof initNeon>) {
  const collection = 'users';
  if (SKIP_COLLECTIONS.includes(collection)) {
    console.info(`  [SKIP] ${collection}`);
    return;
  }
  initStats(collection);

  const snapshot = await fsDb.collection('users').get();
  stats[collection].firestore = snapshot.size;
  console.info(`  Firestore: ${snapshot.size} docs`);

  const rows = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      email: d.email || '',
      display_name: d.displayName || d.email || '',
      role: d.role === 'admin' ? 'admin' : 'member',
      is_allowed: d.isAllowed ?? false,
      github_username: d.githubUsername || null,
      google_refresh_token: d.googleRefreshToken || null,
      google_oauth_updated_at: toDate(d.googleOAuthUpdatedAt),
      chat_id: d.chatId || null,
      fcm_tokens: toStringArray(d.fcmTokens),
      created_at: toDateRequired(d.createdAt),
      updated_at: toDateRequired(d.updatedAt),
    };
  });

  if (!DRY_RUN && rows.length > 0) {
    for (const batch of chunk(rows, BATCH_SIZE)) {
      const values = batch
        .map(
          (r) =>
            `(${esc(r.id)}, ${esc(r.email)}, ${esc(r.display_name)}, ${esc(r.role)}::user_role, ${r.is_allowed}, ${escNull(r.github_username)}, ${escNull(r.google_refresh_token)}, ${escTs(r.google_oauth_updated_at)}, ${escNull(r.chat_id)}, ${escArr(r.fcm_tokens)}, ${escTs(r.created_at)}, ${escTs(r.updated_at)})`
        )
        .join(',\n');

      await db.execute(
        sql.raw(`
        INSERT INTO users (id, email, display_name, role, is_allowed, github_username, google_refresh_token, google_oauth_updated_at, chat_id, fcm_tokens, created_at, updated_at)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `)
      );
      stats[collection].neon += batch.length;
    }
  }
}

/** labels コレクション */
async function migrateLabels(fsDb: Firestore, db: ReturnType<typeof initNeon>) {
  const collection = 'labels';
  if (SKIP_COLLECTIONS.includes(collection)) {
    console.info(`  [SKIP] ${collection}`);
    return;
  }
  initStats(collection);

  const snapshot = await fsDb.collection('labels').get();
  stats[collection].firestore = snapshot.size;
  console.info(`  Firestore: ${snapshot.size} docs`);

  const rows = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name || '',
      color: d.color || '#000000',
      project_id: d.projectId || null,
      owner_id: d.ownerId || '',
      created_at: toDateRequired(d.createdAt),
      updated_at: toDateRequired(d.updatedAt),
    };
  });

  if (!DRY_RUN && rows.length > 0) {
    for (const batch of chunk(rows, BATCH_SIZE)) {
      const values = batch
        .map(
          (r) =>
            `(${esc(r.id)}, ${esc(r.name)}, ${esc(r.color)}, ${escNull(r.project_id)}, ${esc(r.owner_id)}, ${escTs(r.created_at)}, ${escTs(r.updated_at)})`
        )
        .join(',\n');

      await db.execute(
        sql.raw(`
        INSERT INTO labels (id, name, color, project_id, owner_id, created_at, updated_at)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `)
      );
      stats[collection].neon += batch.length;
    }
  }
}

/** contacts コレクション */
async function migrateContacts(fsDb: Firestore, db: ReturnType<typeof initNeon>) {
  const collection = 'contacts';
  if (SKIP_COLLECTIONS.includes(collection)) {
    console.info(`  [SKIP] ${collection}`);
    return;
  }
  initStats(collection);

  const snapshot = await fsDb.collection('contacts').get();
  stats[collection].firestore = snapshot.size;
  console.info(`  Firestore: ${snapshot.size} docs`);

  const rows = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      type: d.type || 'other',
      title: d.title || '',
      content: d.content || '',
      user_id: d.userId || '',
      user_name: d.userName || '',
      user_email: d.userEmail || '',
      error_report_details: d.errorReportDetails ? JSON.stringify(d.errorReportDetails) : null,
      github_issue_url: d.githubIssueUrl || null,
      status: d.status || 'pending',
      created_at: toDateRequired(d.createdAt),
      updated_at: toDateRequired(d.updatedAt),
    };
  });

  if (!DRY_RUN && rows.length > 0) {
    for (const batch of chunk(rows, BATCH_SIZE)) {
      const values = batch
        .map(
          (r) =>
            `(${esc(r.id)}, ${esc(r.type)}::contact_type, ${esc(r.title)}, ${esc(r.content)}, ${esc(r.user_id)}, ${esc(r.user_name)}, ${esc(r.user_email)}, ${escJsonb(r.error_report_details)}, ${escNull(r.github_issue_url)}, ${esc(r.status)}::contact_status, ${escTs(r.created_at)}, ${escTs(r.updated_at)})`
        )
        .join(',\n');

      await db.execute(
        sql.raw(`
        INSERT INTO contacts (id, type, title, content, user_id, user_name, user_email, error_report_details, github_issue_url, status, created_at, updated_at)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `)
      );
      stats[collection].neon += batch.length;
    }
  }
}

/** tasks サブコレクション（全プロジェクトタイプ横断） */
async function migrateTasks(
  fsDb: Firestore,
  db: ReturnType<typeof initNeon>
): Promise<Set<string>> {
  const collection = 'tasks';
  const taskIds = new Set<string>();
  if (SKIP_COLLECTIONS.includes(collection)) {
    console.info(`  [SKIP] ${collection}`);
    return taskIds;
  }
  initStats(collection);
  initStats('task_externals');

  const allTasks: Array<Record<string, unknown>> = [];
  const allExternals: Array<Record<string, unknown>> = [];

  for (const projectType of PROJECT_TYPES) {
    const snapshot = await fsDb.collection(`projects/${projectType}/tasks`).get();
    console.info(`    ${projectType}: ${snapshot.size} tasks`);

    for (const doc of snapshot.docs) {
      const d = doc.data();
      stats[collection].firestore++;
      taskIds.add(doc.id);

      allTasks.push({
        id: doc.id,
        project_type: projectType,
        title: d.title || '',
        description: d.description || null,
        flow_status: d.flowStatus || '未着手',
        progress_status: d.progressStatus || null,
        assignee_ids: toStringArray(d.assigneeIds),
        it_up_date: toDate(d.itUpDate),
        release_date: toDate(d.releaseDate),
        kubun_label_id: d.kubunLabelId || '',
        google_drive_url: d.googleDriveUrl || null,
        fire_issue_url: d.fireIssueUrl || null,
        google_chat_thread_url: d.googleChatThreadUrl || null,
        backlog_url: d.backlogUrl || null,
        due_date: toDate(d.dueDate),
        priority: d.priority || null,
        order: d.order ?? 0,
        over3_reason: d.over3Reason || null,
        created_by: d.createdBy || '',
        created_at: toDateRequired(d.createdAt),
        updated_at: toDateRequired(d.updatedAt),
        completed_at: toDate(d.completedAt),
      });

      // external (ネストオブジェクト → 別テーブル)
      if (d.external && d.external.issueId) {
        stats['task_externals'].firestore++;
        allExternals.push({
          id: `ext_${doc.id}`,
          task_id: doc.id,
          source: d.external.source || 'backlog',
          issue_id: d.external.issueId || '',
          issue_key: d.external.issueKey || '',
          url: d.external.url || '',
          last_synced_at: toDateRequired(d.external.lastSyncedAt),
          sync_status: d.external.syncStatus || 'ok',
        });
      }
    }
  }

  console.info(
    `  Firestore total: ${stats[collection].firestore} tasks, ${stats['task_externals'].firestore} externals`
  );

  // tasks INSERT
  if (!DRY_RUN && allTasks.length > 0) {
    for (const batch of chunk(allTasks, BATCH_SIZE)) {
      const values = batch
        .map(
          (r) =>
            `(${esc(r.id as string)}, ${esc(r.project_type as string)}::project_type, ${esc(r.title as string)}, ${escNull(r.description as string | null)}, ${esc(r.flow_status as string)}::flow_status, ${escEnumNull(r.progress_status as string | null, 'progress_status')}, ${escArr(r.assignee_ids as string[])}, ${escTs(r.it_up_date as Date | null)}, ${escTs(r.release_date as Date | null)}, ${esc(r.kubun_label_id as string)}, ${escNull(r.google_drive_url as string | null)}, ${escNull(r.fire_issue_url as string | null)}, ${escNull(r.google_chat_thread_url as string | null)}, ${escNull(r.backlog_url as string | null)}, ${escTs(r.due_date as Date | null)}, ${escEnumNull(r.priority as string | null, 'priority')}, ${r.order}, ${escNull(r.over3_reason as string | null)}, ${esc(r.created_by as string)}, ${escTs(r.created_at as Date | null)}, ${escTs(r.updated_at as Date | null)}, ${escTs(r.completed_at as Date | null)})`
        )
        .join(',\n');

      await db.execute(
        sql.raw(`
        INSERT INTO tasks (id, project_type, title, description, flow_status, progress_status, assignee_ids, it_up_date, release_date, kubun_label_id, google_drive_url, fire_issue_url, google_chat_thread_url, backlog_url, due_date, priority, "order", over3_reason, created_by, created_at, updated_at, completed_at)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `)
      );
      stats[collection].neon += batch.length;
    }
  }

  // task_externals INSERT
  if (!DRY_RUN && allExternals.length > 0) {
    for (const batch of chunk(allExternals, BATCH_SIZE)) {
      const values = batch
        .map(
          (r) =>
            `(${esc(r.id as string)}, ${esc(r.task_id as string)}, ${esc(r.source as string)}::external_source, ${esc(r.issue_id as string)}, ${esc(r.issue_key as string)}, ${esc(r.url as string)}, ${escTs(r.last_synced_at as Date | null)}, ${esc(r.sync_status as string)}::sync_status)`
        )
        .join(',\n');

      await db.execute(
        sql.raw(`
        INSERT INTO task_externals (id, task_id, source, issue_id, issue_key, url, last_synced_at, sync_status)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `)
      );
      stats['task_externals'].neon += batch.length;
    }
  }

  return taskIds;
}

/** taskSessions サブコレクション */
async function migrateTaskSessions(
  fsDb: Firestore,
  db: ReturnType<typeof initNeon>,
  validTaskIds: Set<string>
) {
  const collection = 'task_sessions';
  if (SKIP_COLLECTIONS.includes(collection)) {
    console.info(`  [SKIP] ${collection}`);
    return;
  }
  initStats(collection);

  const allRows: Array<Record<string, unknown>> = [];

  for (const projectType of PROJECT_TYPES) {
    const snapshot = await fsDb.collection(`projects/${projectType}/taskSessions`).get();
    console.info(`    ${projectType}: ${snapshot.size} sessions`);

    for (const doc of snapshot.docs) {
      const d = doc.data();
      stats[collection].firestore++;

      const taskId = d.taskId || '';
      if (validTaskIds.size > 0 && !validTaskIds.has(taskId)) {
        stats[collection].errors++;
        continue;
      }

      allRows.push({
        id: doc.id,
        task_id: taskId,
        project_type: projectType,
        user_id: d.userId || '',
        started_at: toDateRequired(d.startedAt),
        ended_at: toDate(d.endedAt),
        duration_sec: d.durationSec ?? 0,
        note: d.note || null,
      });
    }
  }

  console.info(
    `  Firestore total: ${stats[collection].firestore} sessions (${stats[collection].errors} orphaned, skipped)`
  );

  if (!DRY_RUN && allRows.length > 0) {
    for (const batch of chunk(allRows, BATCH_SIZE)) {
      const values = batch
        .map(
          (r) =>
            `(${esc(r.id as string)}, ${esc(r.task_id as string)}, ${esc(r.project_type as string)}::project_type, ${esc(r.user_id as string)}, ${escTs(r.started_at as Date | null)}, ${escTs(r.ended_at as Date | null)}, ${r.duration_sec}, ${escNull(r.note as string | null)})`
        )
        .join(',\n');

      await db.execute(
        sql.raw(`
        INSERT INTO task_sessions (id, task_id, project_type, user_id, started_at, ended_at, duration_sec, note)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `)
      );
      stats[collection].neon += batch.length;
    }
  }
}

/** taskComments サブコレクション */
async function migrateTaskComments(
  fsDb: Firestore,
  db: ReturnType<typeof initNeon>,
  validTaskIds: Set<string>
) {
  const collection = 'task_comments';
  if (SKIP_COLLECTIONS.includes(collection)) {
    console.info(`  [SKIP] ${collection}`);
    return;
  }
  initStats(collection);

  const allRows: Array<Record<string, unknown>> = [];

  for (const projectType of PROJECT_TYPES) {
    const snapshot = await fsDb.collection(`projects/${projectType}/taskComments`).get();
    console.info(`    ${projectType}: ${snapshot.size} comments`);

    for (const doc of snapshot.docs) {
      const d = doc.data();
      stats[collection].firestore++;

      const taskId = d.taskId || '';
      if (validTaskIds.size > 0 && !validTaskIds.has(taskId)) {
        stats[collection].errors++;
        continue;
      }

      allRows.push({
        id: doc.id,
        task_id: taskId,
        project_type: projectType,
        author_id: d.authorId || '',
        content: d.content || '',
        mentioned_user_ids: toStringArray(d.mentionedUserIds),
        read_by: toStringArray(d.readBy),
        created_at: toDateRequired(d.createdAt),
        updated_at: toDateRequired(d.updatedAt),
      });
    }
  }

  console.info(
    `  Firestore total: ${stats[collection].firestore} comments (${stats[collection].errors} orphaned, skipped)`
  );

  if (!DRY_RUN && allRows.length > 0) {
    for (const batch of chunk(allRows, BATCH_SIZE)) {
      const values = batch
        .map(
          (r) =>
            `(${esc(r.id as string)}, ${esc(r.task_id as string)}, ${esc(r.project_type as string)}::project_type, ${esc(r.author_id as string)}, ${esc(r.content as string)}, ${escArr(r.mentioned_user_ids as string[])}, ${escArr(r.read_by as string[])}, ${escTs(r.created_at as Date | null)}, ${escTs(r.updated_at as Date | null)})`
        )
        .join(',\n');

      await db.execute(
        sql.raw(`
        INSERT INTO task_comments (id, task_id, project_type, author_id, content, mentioned_user_ids, read_by, created_at, updated_at)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `)
      );
      stats[collection].neon += batch.length;
    }
  }
}

/** taskActivities サブコレクション */
async function migrateTaskActivities(
  fsDb: Firestore,
  db: ReturnType<typeof initNeon>,
  validTaskIds: Set<string>
) {
  const collection = 'task_activities';
  if (SKIP_COLLECTIONS.includes(collection)) {
    console.info(`  [SKIP] ${collection}`);
    return;
  }
  initStats(collection);

  const allRows: Array<Record<string, unknown>> = [];

  for (const projectType of PROJECT_TYPES) {
    const snapshot = await fsDb.collection(`projects/${projectType}/taskActivities`).get();
    console.info(`    ${projectType}: ${snapshot.size} activities`);

    for (const doc of snapshot.docs) {
      const d = doc.data();
      stats[collection].firestore++;

      const taskId = d.taskId || '';
      if (validTaskIds.size > 0 && !validTaskIds.has(taskId)) {
        stats[collection].errors++;
        continue;
      }

      allRows.push({
        id: doc.id,
        task_id: taskId,
        project_type: projectType,
        type: d.type || 'update',
        actor_id: d.actorId || '',
        payload: d.payload ? JSON.stringify(d.payload) : null,
        created_at: toDateRequired(d.createdAt),
      });
    }
  }

  console.info(
    `  Firestore total: ${stats[collection].firestore} activities (${stats[collection].errors} orphaned, skipped)`
  );

  if (!DRY_RUN && allRows.length > 0) {
    for (const batch of chunk(allRows, BATCH_SIZE)) {
      const values = batch
        .map(
          (r) =>
            `(${esc(r.id as string)}, ${esc(r.task_id as string)}, ${esc(r.project_type as string)}::project_type, ${esc(r.type as string)}::activity_type, ${esc(r.actor_id as string)}, ${escJsonb(r.payload as string | null)}, ${escTs(r.created_at as Date | null)})`
        )
        .join(',\n');

      await db.execute(
        sql.raw(`
        INSERT INTO task_activities (id, task_id, project_type, type, actor_id, payload, created_at)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `)
      );
      stats[collection].neon += batch.length;
    }
  }
}

/** projects コレクション（Firestoreの projects はプロジェクト設定用。タスクは subcollection） */
async function migrateProjects(fsDb: Firestore, db: ReturnType<typeof initNeon>) {
  const collection = 'projects';
  if (SKIP_COLLECTIONS.includes(collection)) {
    console.info(`  [SKIP] ${collection}`);
    return;
  }
  initStats(collection);

  // Firestore の projects コレクションにはプロジェクト設定ドキュメントがある
  // また、PROJECT_TYPES で定義されたキーでサブコレクション用のドキュメントがある
  // nameフィールドがない場合はIDをnameとして使用
  const snapshot = await fsDb.collection('projects').get();
  const firestoreIds = new Set(snapshot.docs.map((doc) => doc.id));

  // Firestoreにドキュメントがあるものを移行
  const rows = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name || doc.id,
      owner_id: d.ownerId || '',
      member_ids: toStringArray(d.memberIds),
      backlog_project_key: d.backlogProjectKey || null,
      drive_parent_id: d.driveParentId || null,
      created_at: d.createdAt ? toDateRequired(d.createdAt) : new Date(),
      updated_at: d.updatedAt ? toDateRequired(d.updatedAt) : new Date(),
    };
  });

  // Firestoreにドキュメントがないが PROJECT_TYPES に定義されているものも追加
  for (const pt of PROJECT_TYPES) {
    if (!firestoreIds.has(pt)) {
      rows.push({
        id: pt,
        name: pt,
        owner_id: '',
        member_ids: [],
        backlog_project_key: null,
        drive_parent_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  stats[collection].firestore = rows.length;
  console.info(
    `  Projects: ${rows.length} (${snapshot.size} from Firestore + ${rows.length - snapshot.size} from PROJECT_TYPES)`
  );

  if (!DRY_RUN && rows.length > 0) {
    for (const batch of chunk(rows, BATCH_SIZE)) {
      const values = batch
        .map(
          (r) =>
            `(${esc(r.id)}, ${esc(r.name)}, ${esc(r.owner_id)}, ${escArr(r.member_ids)}, ${escNull(r.backlog_project_key)}, ${escNull(r.drive_parent_id)}, ${escTs(r.created_at)}, ${escTs(r.updated_at)})`
        )
        .join(',\n');

      await db.execute(
        sql.raw(`
        INSERT INTO projects (id, name, owner_id, member_ids, backlog_project_key, drive_parent_id, created_at, updated_at)
        VALUES ${values}
        ON CONFLICT (id) DO NOTHING
      `)
      );
      stats[collection].neon += batch.length;
    }
  }
}

// --- SQL エスケープヘルパー ---

function esc(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function escNull(value: string | null): string {
  return value === null || value === undefined ? 'NULL' : esc(value);
}

function escTs(value: Date | null): string {
  if (!value) return 'NULL';
  return `'${value.toISOString()}'::timestamptz`;
}

function escArr(value: string[]): string {
  if (!value || value.length === 0) return 'ARRAY[]::text[]';
  return `ARRAY[${value.map((v) => esc(v)).join(',')}]::text[]`;
}

function escJsonb(value: string | null): string {
  if (!value) return 'NULL';
  return `'${value.replace(/'/g, "''")}'::jsonb`;
}

function escEnumNull(value: string | null, enumName: string): string {
  if (!value) return 'NULL';
  return `${esc(value)}::${enumName}`;
}

// --- メイン ---

async function main() {
  console.info('=== Firestore → Neon データ移行 ===');
  console.info(`DRY_RUN: ${DRY_RUN}`);
  console.info(`SKIP: ${SKIP_COLLECTIONS.length > 0 ? SKIP_COLLECTIONS.join(', ') : '(none)'}`);
  console.info('');

  // 初期化
  const fsDb = initFirebase();
  const db = initNeon();

  console.info('[1/8] users');
  await migrateUsers(fsDb, db);

  console.info('[2/8] projects');
  await migrateProjects(fsDb, db);

  console.info('[3/8] labels');
  await migrateLabels(fsDb, db);

  console.info('[4/8] contacts');
  await migrateContacts(fsDb, db);

  console.info('[5/8] tasks + task_externals');
  const validTaskIds = await migrateTasks(fsDb, db);

  console.info('[6/8] task_sessions');
  await migrateTaskSessions(fsDb, db, validTaskIds);

  console.info('[7/8] task_comments');
  await migrateTaskComments(fsDb, db, validTaskIds);

  console.info('[8/8] task_activities');
  await migrateTaskActivities(fsDb, db, validTaskIds);

  // 結果サマリー
  console.info('');
  console.info('=== 移行結果サマリー ===');
  console.info('Collection          | Firestore | Neon    | Errors');
  console.info('--------------------|-----------|---------|-------');
  for (const [name, s] of Object.entries(stats)) {
    const padName = name.padEnd(20);
    const padFs = String(s.firestore).padStart(9);
    const padNeon = String(DRY_RUN ? '(dry)' : s.neon).padStart(7);
    const padErr = String(s.errors).padStart(6);
    console.info(`${padName}|${padFs} |${padNeon} |${padErr}`);
  }

  if (DRY_RUN) {
    console.info('');
    console.info('DRY_RUN モードのため、Neon への書き込みは行われていません。');
    console.info('実行するには DRY_RUN=false で再実行してください。');
  }

  console.info('');
  console.info('移行完了！');
}

main()
  .then(async () => {
    // postgres-js の接続は明示 close しないとプロセスが終了しない
    if (postgresClient) await postgresClient.end();
  })
  .catch(async (error) => {
    console.error('移行エラー:', error);
    if (postgresClient) await postgresClient.end();
    process.exit(1);
  });
