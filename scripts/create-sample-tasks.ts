import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// .env.localを読み込む
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

// サンプルタスク作成スクリプト
// 実行方法: npx ts-node scripts/create-sample-tasks.ts

// プロジェクトタイプの固定値
const PROJECT_TYPES = ['REG2017', 'BRGREG', 'MONO', 'MONO_ADMIN', 'DES_FIRE', 'DesignSystem', 'DMREG2', 'monosus'] as const;
type ProjectType = (typeof PROJECT_TYPES)[number];

// タスクのステータスオプション
const FLOW_STATUS_OPTIONS = [
  '未着手',
  'ディレクション',
  'コーディング',
  'デザイン',
  '待ち',
  '対応中',
  '週次報告',
  '月次報告',
  '完了',
] as const;
type FlowStatus = (typeof FLOW_STATUS_OPTIONS)[number];

// サンプルタスクタイトルのリスト
const SAMPLE_TITLES = [
  'ログイン機能の実装',
  'ユーザー認証の改善',
  'ダッシュボードのUI改善',
  'APIエンドポイントの追加',
  'データベーススキーマの更新',
  'エラーハンドリングの強化',
  'パフォーマンス最適化',
  'レスポンシブデザインの対応',
  'テストコードの追加',
  'ドキュメントの整備',
  'セキュリティ対策の実装',
  'バグ修正: メモリリーク',
  '新機能: 通知機能',
  'UIコンポーネントのリファクタリング',
  'データエクスポート機能',
  'レポート機能の改善',
  '検索機能の追加',
  'フィルター機能の実装',
  'ソート機能の改善',
  'ページネーションの実装',
  '画像アップロード機能',
  'ファイル管理機能',
  'コメント機能の追加',
  'リアルタイム更新の実装',
  'オフライン対応',
  '多言語対応',
  'アクセシビリティの改善',
  'SEO対策の実装',
  'アナリティクスの統合',
  'ログ機能の追加',
];

async function createSampleTasks() {
  // Firebase Admin初期化（環境変数から認証情報を取得）
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  const db = getFirestore(app);

  // 既存の区分ラベルを取得（projectIdがnullのラベル）
  const labelsSnapshot = await db
    .collection('labels')
    .where('projectId', '==', null)
    .get();

  if (labelsSnapshot.empty) {
    console.error('区分ラベルが存在しません。先に create-kubun-labels.ts を実行してください。');
    process.exit(1);
  }

  const labels = labelsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name as string,
      color: data.color as string,
    };
  });

  const defaultLabelId = labels[0].id; // 最初のラベルを使用

  console.info(`使用する区分ラベル: ${labels.map((l) => l.name).join(', ')}`);
  console.info(`デフォルトラベルID: ${defaultLabelId}`);

  // 30件のタスクを作成
  const taskCount = 30;
  const createdTasks: Array<{ projectType: string; taskId: string; title: string }> = [];

  for (let i = 0; i < taskCount; i++) {
    // ランダムにプロジェクトタイプを選択
    const projectType = PROJECT_TYPES[Math.floor(Math.random() * PROJECT_TYPES.length)] as ProjectType;

    // ランダムにステータスを選択
    const flowStatus = FLOW_STATUS_OPTIONS[
      Math.floor(Math.random() * FLOW_STATUS_OPTIONS.length)
    ] as FlowStatus;

    // タイトルを選択（重複を避けるため、インデックスを使用）
    const titleIndex = i % SAMPLE_TITLES.length;
    const title = `${SAMPLE_TITLES[titleIndex]} (${i + 1})`;

    // ランダムにラベルを選択
    const label = labels[Math.floor(Math.random() * labels.length)];

    // 日付をランダムに生成（過去30日から未来30日の範囲）
    const now = Date.now();
    const daysOffset = Math.floor(Math.random() * 60) - 30; // -30 から +30 日
    const randomDate = new Date(now + daysOffset * 24 * 60 * 60 * 1000);

    // itUpDateとreleaseDateをランダムに設定（50%の確率でnull）
    const itUpDate = Math.random() > 0.5 ? randomDate : null;
    const releaseDate = Math.random() > 0.5 ? randomDate : null;

    const taskData = {
      projectType,
      title,
      description: `${title}の詳細説明です。これはサンプルタスクの${i + 1}件目です。`,
      flowStatus,
      assigneeIds: [], // 空配列
      itUpDate,
      releaseDate,
      kubunLabelId: label.id,
      order: Date.now() + i, // 順序を保つため
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const taskRef = await db
      .collection('projects')
      .doc(projectType)
      .collection('tasks')
      .add(taskData);

    createdTasks.push({
      projectType,
      taskId: taskRef.id,
      title,
    });

    console.info(`[${i + 1}/${taskCount}] タスクを作成しました: ${title} (${projectType})`);
  }

  console.info('\n=== 作成完了 ===');
  console.info(`合計 ${taskCount} 件のタスクを作成しました。\n`);

  // プロジェクトタイプ別の集計
  const summary = createdTasks.reduce(
    (acc, task) => {
      acc[task.projectType] = (acc[task.projectType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.info('プロジェクトタイプ別の内訳:');
  Object.entries(summary).forEach(([projectType, count]) => {
    console.info(`  ${projectType}: ${count}件`);
  });
}

createSampleTasks().catch((error) => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});
