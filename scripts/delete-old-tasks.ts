import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PROJECT_TYPES } from '../constants/projectTypes.js';

/**
 * 既存のタスクを削除するスクリプト
 * プロジェクト実装変更により、古いプロジェクトIDベースのタスクは不要になったため削除
 * 実行方法: npx ts-node scripts/delete-old-tasks.ts
 */

async function deleteOldTasks() {
  // Firebase Admin初期化（環境変数から認証情報を取得）
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  const db = getFirestore(app);

  console.info('既存タスクの削除を開始します...');

  try {
    // すべてのプロジェクトを取得
    const projectsSnapshot = await db.collection('projects').get();

    if (projectsSnapshot.empty) {
      console.info('プロジェクトが見つかりませんでした');
      return;
    }

    let totalDeletedTasks = 0;
    let totalDeletedSessions = 0;

    // 各プロジェクトのタスクとセッションを削除
    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;
      const projectData = projectDoc.data();

      // プロジェクトタイプ（固定値）の場合はスキップ（PRREGを含む全タイプを保護）
      if (PROJECT_TYPES.includes(projectId as any)) {
        console.info(`プロジェクトタイプ "${projectId}" はスキップします`);
        continue;
      }

      console.info(`プロジェクト "${projectId}" (${projectData.name || '名前なし'}) のタスクを削除中...`);

      // タスクを取得して削除
      const tasksSnapshot = await db
        .collection('projects')
        .doc(projectId)
        .collection('tasks')
        .get();

      const batch = db.batch();
      let batchCount = 0;

      for (const taskDoc of tasksSnapshot.docs) {
        const taskId = taskDoc.id;

        // タスクセッションを削除
        const sessionsSnapshot = await db
          .collection('projects')
          .doc(projectId)
          .collection('taskSessions')
          .where('taskId', '==', taskId)
          .get();

        for (const sessionDoc of sessionsSnapshot.docs) {
          batch.delete(sessionDoc.ref);
          batchCount++;
          totalDeletedSessions++;

          // バッチサイズ制限（500件）に達したらコミット
          if (batchCount >= 450) {
            await batch.commit();
            batchCount = 0;
          }
        }

        // タスクを削除
        batch.delete(taskDoc.ref);
        batchCount++;
        totalDeletedTasks++;

        // バッチサイズ制限（500件）に達したらコミット
        if (batchCount >= 450) {
          await batch.commit();
          batchCount = 0;
        }
      }

      // 残りのバッチをコミット
      if (batchCount > 0) {
        await batch.commit();
      }

      console.info(
        `プロジェクト "${projectId}": ${tasksSnapshot.size}件のタスクを削除しました`
      );
    }

    console.info('\n削除完了:');
    console.info(`- タスク: ${totalDeletedTasks}件`);
    console.info(`- セッション: ${totalDeletedSessions}件`);
    console.info('\n既存タスクの削除が完了しました');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  }
}

// 実行確認（環境変数で強制実行を許可）
const FORCE_DELETE = process.env.FORCE_DELETE === 'true';

if (!FORCE_DELETE) {
  console.warn('⚠️  警告: このスクリプトは既存のタスクとセッションを削除します');
  console.warn('実行するには、環境変数 FORCE_DELETE=true を設定してください');
  console.warn('例: FORCE_DELETE=true npx ts-node scripts/delete-old-tasks.ts');
  process.exit(1);
}

deleteOldTasks()
  .then(() => {
    console.info('処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
