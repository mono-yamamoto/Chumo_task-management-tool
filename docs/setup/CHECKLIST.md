# Firebase初期設定チェックリスト

## 前提条件

- [ ] Firebase CLIがインストールされている (`firebase --version`で確認)
- [ ] Node.js 20がインストールされている
- [ ] npm/yarnがインストールされている

## Step 1: Firebaseプロジェクト作成

- [ ] [Firebase Console](https://console.firebase.google.com/)にアクセス
- [ ] 「プロジェクトを追加」をクリック
- [ ] プロジェクト名を入力（例: `chumo-task-management`）
- [ ] Google Analyticsの設定（任意）
- [ ] プロジェクト作成完了

## Step 2: Firebase認証設定

- [ ] Firebase Console → Authentication → 「始める」をクリック
- [ ] 「Sign-in method」タブを開く
- [ ] 「Google」を有効化
- [ ] プロジェクトのサポートメールを選択
- [ ] 「保存」をクリック

## Step 3: Firestoreデータベース作成

- [ ] Firebase Console → Firestore Database → 「データベースを作成」
- [ ] 「本番モードで開始」を選択
- [ ] ロケーションを選択（推奨: `asia-northeast1 (Tokyo)`）
- [ ] 「有効にする」をクリック
- [ ] データベース作成完了を待つ

## Step 4: Firebase CLI設定

```bash
# ターミナルで実行
firebase login
firebase use --add
# プロジェクトIDを選択
```

## Step 5: 環境変数設定

- [ ] `.env.local`ファイルを作成
- [ ] Firebase Console → プロジェクト設定 → 全般 → 「アプリを追加」→ Web
- [ ] アプリのニックネームを入力
- [ ] Firebase SDKの設定をコピーして`.env.local`に貼り付け

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FUNCTIONS_URL=https://your-region-your-project.cloudfunctions.net
```

## Step 6: Firestoreセキュリティルールデプロイ

```bash
firebase deploy --only firestore:rules
```

- [ ] デプロイ成功を確認
- [ ] Firebase Console → Firestore Database → 「ルール」タブで確認

## Step 7: Firestoreインデックスデプロイ

```bash
firebase deploy --only firestore:indexes
```

- [ ] デプロイ成功を確認
- [ ] Firebase Console → Firestore Database → 「インデックス」タブで確認
- [ ] インデックスが「構築中」または「有効」になっていることを確認

## Step 8: 動作確認

```bash
# フロントエンドを起動
npm run dev
```

- [ ] ブラウザで `http://localhost:3000` にアクセス
- [ ] ログインページが表示されることを確認
- [ ] Googleログインが動作することを確認（許可リストに追加されたユーザーのみ）

## 次のステップ

- [ ] GCP Secret Managerの設定
- [ ] Cloud Functionsのデプロイ
- [ ] 初期データの作成
