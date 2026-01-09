import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// .env.localを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

// 区分ラベル作成スクリプト
// 実行方法: npx ts-node scripts/create-kubun-labels.ts

async function createKubunLabels() {
  // Firebase Admin初期化（環境変数から認証情報を取得）
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  const db = getFirestore(app);

  // 既存の区分ラベルを確認（projectIdがnullのラベル）
  const existingLabelsRef = db.collection('labels');
  const existingLabelsSnapshot = await existingLabelsRef.where('projectId', '==', null).get();

  const existingLabelNames = existingLabelsSnapshot.docs.map((doc) => doc.data().name);

  // 区分ラベルを定義
  const kubunLabels = [
    { name: '個別', color: '#3b82f6' },
    { name: '運用', color: '#10b981' },
  ];

  // 既存のラベルをスキップして、新しいラベルのみ作成
  for (const label of kubunLabels) {
    if (!existingLabelNames.includes(label.name)) {
      await db.collection('labels').add({
        name: label.name,
        color: label.color,
        projectId: null, // 区分ラベルは全プロジェクト共通
        ownerId: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.info(`区分ラベル「${label.name}」を作成しました。`);
    } else {
      console.info(`区分ラベル「${label.name}」は既に存在します。スキップします。`);
    }
  }

  console.info('区分ラベルの作成が完了しました');
}

createKubunLabels().catch(console.error);
