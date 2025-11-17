import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ユーザー作成スクリプト
// 実行方法: npx ts-node scripts/create-user.ts

const args = process.argv.slice(2);
const uidIndex = args.indexOf('--uid');
const emailIndex = args.indexOf('--email');
const displayNameIndex = args.indexOf('--displayName');
const roleIndex = args.indexOf('--role');

if (uidIndex === -1 || emailIndex === -1 || displayNameIndex === -1) {
  console.error(
    'Usage: npx ts-node scripts/create-user.ts --uid <UID> --email <EMAIL> --displayName <DISPLAY_NAME> [--role admin|member]'
  );
  process.exit(1);
}

const uid = args[uidIndex + 1];
const email = args[emailIndex + 1];
const displayName = args[displayNameIndex + 1];
const role = args[roleIndex + 1] || 'member';

async function createUser() {
  // Firebase Admin初期化（環境変数から認証情報を取得）
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'chumo-3506a',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  const db = getFirestore(app);

  const userData = {
    email,
    displayName,
    role: role === 'admin' ? 'admin' : 'member',
    isAllowed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await db.collection('users').doc(uid).set(userData);
    console.log('ユーザーを作成しました:');
    console.log(`  UID: ${uid}`);
    console.log(`  メール: ${email}`);
    console.log(`  表示名: ${displayName}`);
    console.log(`  ロール: ${role}`);
    console.log('  許可: true');
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

createUser().catch(console.error);
