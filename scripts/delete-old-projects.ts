import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * 古いプロジェクトドキュメントを削除するスクリプト
 * プロジェクト実装変更により、古いプロジェクトIDベースのドキュメントは不要になったため削除
 * プロジェクトタイプのドキュメント（REG2017, BRGREGなど）は保持（タスクのサブコレクションを保持するため）
 * 実行方法: FORCE_DELETE=true npx ts-node scripts/delete-old-projects.ts
 */

async function deleteOldProjects() {
  // Firebase Admin初期化（環境変数から認証情報を取得）
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  const db = getFirestore(app);

  console.info('古いプロジェクトドキュメントの削除を開始します...');

  try {
    // プロジェクトタイプ（固定値）のリスト
    const PROJECT_TYPES = ['REG2017', 'BRGREG', 'MONO', 'MONO_ADMIN', 'DES_FIRE', 'DesignSystem'];

    // すべてのプロジェクトを取得
    const projectsSnapshot = await db.collection('projects').get();

    if (projectsSnapshot.empty) {
      console.info('プロジェクトが見つかりませんでした');
      return;
    }

    let totalDeleted = 0;
    let totalKept = 0;

    // 各プロジェクトドキュメントを確認
    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;

      // プロジェクトタイプ（固定値）の場合はスキップ
      if (PROJECT_TYPES.includes(projectId)) {
        console.info(`プロジェクトタイプ "${projectId}" は保持します`);
        totalKept++;
        continue;
      }

      // 古いプロジェクトドキュメントを削除
      console.info(`古いプロジェクト "${projectId}" (${projectDoc.data().name || '名前なし'}) を削除中...`);

      // 注意: サブコレクション（tasks, taskSessions）は既にdelete-old-tasks.tsで削除済みのはず
      // 念のため、サブコレクションが空であることを確認
      const tasksSnapshot = await db
        .collection('projects')
        .doc(projectId)
        .collection('tasks')
        .limit(1)
        .get();

      const sessionsSnapshot = await db
        .collection('projects')
        .doc(projectId)
        .collection('taskSessions')
        .limit(1)
        .get();

      if (!tasksSnapshot.empty || !sessionsSnapshot.empty) {
        console.warn(
          `⚠️  警告: プロジェクト "${projectId}" にサブコレクションが残っています。先にdelete-old-tasks.tsを実行してください。`
        );
        continue;
      }

      // プロジェクトドキュメントを削除
      await db.collection('projects').doc(projectId).delete();
      totalDeleted++;

      console.info(`プロジェクト "${projectId}" を削除しました`);
    }

    console.info('\n削除完了:');
    console.info(`- 削除したプロジェクト: ${totalDeleted}件`);
    console.info(`- 保持したプロジェクトタイプ: ${totalKept}件`);
    console.info('\n古いプロジェクトドキュメントの削除が完了しました');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  }
}

// 実行確認（環境変数で強制実行を許可）
const FORCE_DELETE = process.env.FORCE_DELETE === 'true';

if (!FORCE_DELETE) {
  console.warn('⚠️  警告: このスクリプトは古いプロジェクトドキュメントを削除します');
  console.warn('実行するには、環境変数 FORCE_DELETE=true を設定してください');
  console.warn('例: FORCE_DELETE=true npx ts-node scripts/delete-old-projects.ts');
  process.exit(1);
}

deleteOldProjects()
  .then(() => {
    console.info('処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });

