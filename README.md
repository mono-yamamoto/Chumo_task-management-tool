# タスク管理ツール

個人〜小規模チーム向けのタスク管理ツールです。Backlog連携、時間計測、Google Drive/GitHub連携機能を備えています。

## 技術スタック

- **フロントエンド**: Next.js 15 / React 19 / TypeScript / Tailwind CSS
- **バックエンド**: Cloud Functions (2nd gen, Node.js 24) / Firestore
- **認証**: Firebase Auth (Googleログイン)
- **連携**: Google Drive API / GitHub API / Make Webhook

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
cd functions && npm install
```

### 2. Firebase設定

1. Firebaseプロジェクトを作成
2. Firebase CLIをインストール: `npm install -g firebase-tools`
3. Firebaseにログイン: `firebase login`
4. プロジェクトを初期化: `firebase init`
5. `.env.local`ファイルを作成し、Firebase設定を追加:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FUNCTIONS_URL=https://your-region-your-project.cloudfunctions.net
```

### 3. GCP Secret Manager設定

以下のSecretsを作成:

- `MAKE_WEBHOOK_SECRET`: Make Webhookの秘密鍵
- `DRIVE_PARENT_ID`: Google Driveの親フォルダID (`14l_ggl_SBo8FxZFDOKnmN7atbmaG-Rdh`)
- `CHECKSHEET_TEMPLATE_ID`: チェックシートテンプレートID (`1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M`)
- `GITHUB_TOKEN`: GitHub Personal Access Token (repo権限)
- `DRIVE_SERVICE_ACCOUNT_KEY`: Google DriveサービスアカウントのJSONキー

### 4. Firestoreセキュリティルールとインデックス

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Cloud Functionsデプロイ

```bash
cd functions
npm run build
firebase deploy --only functions
```

### 6. 初期データ作成

`scripts/create-initial-data.ts`を実行してサンプルデータを作成します。

## 開発

```bash
# フロントエンド開発サーバー起動
npm run dev

# Cloud Functionsローカル実行
cd functions
npm run serve
```

## 主要機能

- **認証**: Googleログイン + 許可リスト制御
- **タスク管理**: Backlog同期、ローカル項目編集
- **時間計測**: タスクごとのタイマー（排他制御）
- **Google Drive連携**: フォルダ・チェックシート自動作成
- **GitHub連携**: Issue自動作成
- **レポート**: 時間集計とCSVエクスポート

## ライセンス

Private
