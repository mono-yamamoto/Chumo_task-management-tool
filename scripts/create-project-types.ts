import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PROJECT_TYPES } from '../constants/projectTypes.js';

// .env.localを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

// プロジェクトタイプドキュメント作成スクリプト
// 実行方法: npx ts-node scripts/create-project-types.ts

async function createProjectTypes() {
  // Firebase Admin初期化（環境変数から認証情報を取得）
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  const db = getFirestore(app);

  // 作成するプロジェクトタイプ（全てのPROJECT_TYPESを対象）
  const projectTypes = PROJECT_TYPES;

  console.info('プロジェクトタイプドキュメントの作成を開始します...');

  for (const projectType of projectTypes) {
    const projectRef = db.collection('projects').doc(projectType);

    // 既に存在するか確認
    const projectDoc = await projectRef.get();

    if (projectDoc.exists) {
      console.info(`プロジェクトタイプ "${projectType}" は既に存在します。スキップします。`);
      continue;
    }

    // プロジェクトタイプドキュメントを作成（空のドキュメントまたは最小限のデータ）
    await projectRef.set({
      name: projectType,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.info(`プロジェクトタイプ "${projectType}" を作成しました。`);
  }

  console.info('プロジェクトタイプドキュメントの作成が完了しました');
}

createProjectTypes().catch(console.error);

