import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 初期データ作成スクリプト
// 実行方法: npx ts-node scripts/create-initial-data.ts

async function createInitialData() {
  // Firebase Admin初期化（環境変数から認証情報を取得）
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  const db = getFirestore(app);

  // デフォルトプロジェクト作成
  const projectRef = await db.collection('projects').add({
    name: 'サンプルプロジェクト',
    ownerId: 'admin-user-id', // 実際のユーザーIDに置き換え
    memberIds: ['admin-user-id'],
    backlogProjectKey: 'SAMPLE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const projectId = projectRef.id;

  // デフォルトラベル作成（運用）
  const labelRef = await db.collection('labels').add({
    name: '運用',
    color: '#3b82f6',
    projectId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const defaultLabelId = labelRef.id;

  // サンプルタスク作成
  await db.collection('projects').doc(projectId).collection('tasks').add({
    title: 'サンプルタスク',
    description: 'これはサンプルタスクです',
    flowStatus: '未着手',
    assigneeIds: [],
    itUpDate: null,
    releaseDate: null,
    kubunLabelId: defaultLabelId,
    order: Date.now(),
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('初期データの作成が完了しました');
  console.log(`プロジェクトID: ${projectId}`);
  console.log(`デフォルトラベルID: ${defaultLabelId}`);
}

createInitialData().catch(console.error);
