import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as readline from 'readline';

// ユーザー作成スクリプト（対話形式）
// 実行方法: npm run create-user

// 対話的な入力を取得する関数
function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// 選択肢から選ぶ関数
async function selectOption(
  rl: readline.Interface,
  query: string,
  options: string[],
  defaultOption?: string
): Promise<string> {
  const optionsText = options.map((opt, idx) => `  ${idx + 1}. ${opt}`).join('\n');
  const defaultText = defaultOption ? ` (デフォルト: ${defaultOption})` : '';

  while (true) {
    const answer = await question(rl, `${query}${defaultText}\n${optionsText}\n選択: `);
    const trimmed = answer.trim();

    // デフォルト値が設定されていて、空入力の場合はデフォルト値を返す
    if (!trimmed && defaultOption) {
      return defaultOption;
    }

    // 数字で選択
    const num = parseInt(trimmed, 10);
    if (num >= 1 && num <= options.length) {
      return options[num - 1];
    }

    // 直接オプション名で入力
    if (options.includes(trimmed)) {
      return trimmed;
    }

    console.info('❌ 無効な選択です。もう一度入力してください。\n');
  }
}

// 確認を求める関数
async function confirm(rl: readline.Interface, query: string): Promise<boolean> {
  while (true) {
    const answer = await question(rl, `${query} (y/N): `);
    const trimmed = answer.trim().toLowerCase();
    if (trimmed === 'y' || trimmed === 'yes') {
      return true;
    }
    if (trimmed === 'n' || trimmed === 'no' || trimmed === '') {
      return false;
    }
    console.info('❌ y または n を入力してください。\n');
  }
}

async function collectUserInfo(): Promise<{
  email: string;
  displayName: string;
  role: string;
  uid: string | null;
}> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.info('  ユーザー追加スクリプト');
  console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // メールアドレスを入力
  let email: string;
  while (true) {
    const input = await question(rl, '📧 メールアドレス: ');
    const trimmed = input.trim();
    if (trimmed && trimmed.includes('@')) {
      email = trimmed;
      break;
    }
    console.info('❌ 有効なメールアドレスを入力してください。\n');
  }

  // 表示名を入力
  let displayName: string;
  while (true) {
    const input = await question(rl, '👤 表示名: ');
    const trimmed = input.trim();
    if (trimmed) {
      displayName = trimmed;
      break;
    }
    console.info('❌ 表示名を入力してください。\n');
  }

  // ロールを選択
  const role = await selectOption(
    rl,
    '🔐 ロールを選択してください:',
    ['admin', 'member'],
    'member'
  );

  // UIDを直接指定するか確認
  let uid: string | null = null;
  const useUid = await confirm(rl, '\n🔑 UIDを直接指定しますか？（通常は「n」でOK）');
  if (useUid) {
    while (true) {
      const input = await question(rl, 'UID: ');
      const trimmed = input.trim();
      if (trimmed) {
        uid = trimmed;
        break;
      }
      console.info('❌ UIDを入力してください。\n');
    }
  }

  rl.close();

  return { email, displayName, role, uid };
}

async function createUser(userInfo: {
  email: string;
  displayName: string;
  role: string;
  uid: string | null;
}) {
  const { email, displayName, role, uid } = userInfo;

  // Firebase Admin初期化（環境変数から認証情報を取得）
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'chumo-3506a',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  const db = getFirestore(app);
  const auth = getAuth(app);

  let finalUid = uid;

  // UIDが指定されていない場合、メールアドレスからUIDを取得を試みる
  if (!finalUid) {
    console.info('\n🔍 メールアドレスからUIDを検索中...');
    try {
      const userRecord = await auth.getUserByEmail(email);
      finalUid = userRecord.uid;
      console.info(`✅ UIDを取得しました: ${finalUid}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Firebase Authenticationにユーザーが存在しない場合
        // メールアドレスでFirestoreを検索して、既に登録されているか確認
        console.info('Firebase Authenticationにユーザーが見つかりませんでした。');
        console.info('メールアドレスでFirestoreを検索中...');

        const usersRef = db.collection('users');
        const emailQuery = await usersRef.where('email', '==', email).get();

        if (!emailQuery.empty) {
          // 既にメールアドレスで登録されている場合
          const existingDoc = emailQuery.docs[0];
          console.warn(`\n⚠️  警告: メールアドレス "${email}" は既にFirestoreに登録されています。`);
          console.warn(`  ドキュメントID: ${existingDoc.id}`);
          console.warn('  既存のデータ:');
          console.warn(JSON.stringify(existingDoc.data(), null, 2));
          console.warn('');
          console.warn('このユーザーは、Googleログインを試みると自動的にUIDにマッチングされます。');
          console.warn('追加の操作は不要です。\n');
          process.exit(0);
        }

        // メールアドレスで登録されていない場合、事前登録として作成
        console.info('');
        console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.info('事前登録モード: メールアドレスでユーザーを事前登録します');
        console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.info('');
        console.info('このユーザーは、Googleログインを試みると自動的にUIDにマッチングされます。');
        console.info('ユーザーは一度もログイン失敗することなく、スムーズにログインできます。');
        console.info('');

        // メールアドレスをエンコードした一時的なIDを使用
        // Base64エンコードして、URLセーフな文字列に変換
        const emailHash = Buffer.from(email).toString('base64url');
        finalUid = `pending-${emailHash}`;
        console.info(`一時的なドキュメントID: ${finalUid}`);
        console.info('（ログイン時に自動的にUIDに移動されます）');
      } else {
        throw error;
      }
    }
  }

  // 既存のユーザードキュメントをチェック
  console.info('\n🔍 既存のユーザーをチェック中...');
  const existingDoc = await db.collection('users').doc(finalUid).get();
  if (existingDoc.exists) {
    console.warn(`\n⚠️  警告: UID "${finalUid}" のユーザードキュメントは既に存在します。`);
    console.warn('既存のデータ:');
    console.warn(JSON.stringify(existingDoc.data(), null, 2));
    console.warn('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const shouldOverwrite = await confirm(rl, '上書きしますか？');
    rl.close();

    if (!shouldOverwrite) {
      console.info('処理を中断しました。');
      process.exit(0);
    }
  }

  const userData = {
    email,
    displayName,
    role: role === 'admin' ? 'admin' : 'member',
    isAllowed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    console.info('\n💾 ユーザーを作成中...');
    await db.collection('users').doc(finalUid).set(userData);
    console.info('');
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info('✅ ユーザーを作成しました！');
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info(`  UID: ${finalUid}`);
    console.info(`  メール: ${email}`);
    console.info(`  表示名: ${displayName}`);
    console.info(`  ロール: ${role}`);
    console.info('  許可: true');
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('\n❌ エラー:', error);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  try {
    const userInfo = await collectUserInfo();
    await createUser(userInfo);
  } catch (error) {
    console.error('\n❌ エラー:', error);
    process.exit(1);
  }
}

main().catch(console.error);
