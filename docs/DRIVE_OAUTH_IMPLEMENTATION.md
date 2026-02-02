# Google Drive API OAuth 2.0認証の実装手順（方法1: ユーザーごとのトークン）

## 概要

サービスアカウントのストレージ容量制約を回避するため、ユーザーごとのOAuth 2.0トークンを使用してGoogle Drive APIにアクセスします。

## 実装の流れ

1. **OAuth 2.0クライアントID/シークレットの設定**
2. **フロントエンド: Google OAuth 2.0認証フローの実装**
3. **Firestore: ユーザーにリフレッシュトークン保存フィールドを追加**
4. **Cloud Functions: リフレッシュトークンを使用してDrive API/Sheets APIを呼び出す**

## ステップ1: OAuth 2.0クライアントID/シークレットの取得

### 1-1. Google Cloud ConsoleでOAuth 2.0認証情報を作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト `chumo-3506a` を選択
3. 「APIとサービス」→「認証情報」を開く
4. 「認証情報を作成」→「OAuth クライアント ID」を選択
5. アプリケーションの種類: 「ウェブアプリケーション」
6. 名前: `chumo-task-management-oauth`
7. 承認済みの JavaScript 生成元:
   - `http://localhost:3000` (開発環境)
   - `https://your-production-domain.com` (本番環境)
8. 承認済みのリダイレクト URI:
   - `http://localhost:3000/api/auth/google/callback` (開発環境)
   - `https://your-production-domain.com/api/auth/google/callback` (本番環境)
9. 「作成」をクリック
10. クライアントIDとクライアントシークレットをコピー

### 1-2. Secret Managerに保存

```bash
# クライアントIDを保存
echo -n "YOUR_CLIENT_ID" | gcloud secrets create GOOGLE_OAUTH_CLIENT_ID --data-file=- --project=chumo-3506a

# クライアントシークレットを保存
echo -n "YOUR_CLIENT_SECRET" | gcloud secrets create GOOGLE_OAUTH_CLIENT_SECRET --data-file=- --project=chumo-3506a
```

### 1-3. 環境変数の設定

`.env.local`ファイルに以下を追加:

```env
# Google OAuth 2.0用
GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Firebase Admin SDK用（サーバーサイドで使用）
FIREBASE_PROJECT_ID=chumo-3506a
FIREBASE_CLIENT_EMAIL=your_service_account_email@chumo-3506a.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**注意**:

- 本番環境では、適切なリダイレクトURIを設定してください
- `GOOGLE_OAUTH_CLIENT_SECRET`はSecret Managerにも保存しますが、フロントエンドの環境変数にも必要です（APIルートで使用）
- `FIREBASE_CLIENT_EMAIL`と`FIREBASE_PRIVATE_KEY`は、Firebase Admin SDK用のサービスアカウントキーから取得します
  - サービスアカウントキーの取得方法は `docs/setup/SECRET_MANAGER.md` を参照してください

## ステップ2: フロントエンド実装

### 2-1. パッケージのインストール

```bash
npm install googleapis
```

### 2-2. OAuth認証フローの実装

実装済みのファイル:

- `/app/api/auth/google/route.ts`: OAuth認証URLを生成
- `/app/api/auth/google/callback/route.ts`: OAuth認証のコールバック処理
- `/app/(dashboard)/settings/page.tsx`: 設定ページにGoogle Drive連携ボタンを追加

ユーザーが設定ページで「Google Driveと連携」ボタンをクリックすると、OAuth認証フローが開始されます。

### 2-3. リフレッシュトークンの保存

リフレッシュトークンは自動的にFirestoreの`users`コレクションに保存されます。

## ステップ3: Cloud Functions実装

### 3-1. 実装内容

`functions/src/drive/create.ts`を変更して、サービスアカウントの代わりにユーザーのOAuth 2.0トークンを使用するようにしました。

### 3-2. 変更点

1. **リクエストボディからuserIdを取得**
   - フロントエンドから送信されるuserIdを使用

2. **Firestoreからリフレッシュトークンを取得**
   - `users`コレクションからユーザーの`googleRefreshToken`を取得

3. **OAuth 2.0クライアントでアクセストークンを取得**
   - Secret Managerから`GOOGLE_OAUTH_CLIENT_ID`と`GOOGLE_OAUTH_CLIENT_SECRET`を取得
   - リフレッシュトークンからアクセストークンを取得

4. **Drive API/Sheets APIの呼び出し**
   - OAuth 2.0クライアントを使用してDrive API/Sheets APIを呼び出し

### 3-3. デプロイ

```bash
npm run functions:deploy:drive
```

## ステップ4: 使用方法

### 4-1. ユーザーがGoogle Driveと連携する

1. 設定ページ（`/settings`）にアクセス
2. 「Google Driveと連携」ボタンをクリック
3. Googleアカウントでログインして権限を承認
4. 認証が完了すると、設定ページに「連携済み」と表示される

### 4-2. Driveフォルダとチェックシートを作成

1. タスク詳細ページまたはタスク一覧ページで「Drive作成」ボタンをクリック
2. ユーザーのGoogle Driveにフォルダとチェックシートが作成される

## エラーハンドリング

### リフレッシュトークンが無効な場合

- Cloud Functionsからエラーを返し、フロントエンドで再認証を促す
- エラーメッセージに「設定ページでGoogle Driveと連携してください」と表示される
- ユーザーにOAuth認証を再実行してもらう

### アクセストークンの有効期限切れ

- `googleapis`ライブラリが自動的にリフレッシュトークンからアクセストークンを再取得
- ユーザーに影響を与えない

### リフレッシュトークンが存在しない場合

- Cloud Functionsから`requiresAuth: true`フラグ付きのエラーを返す
- フロントエンドで適切なエラーメッセージを表示

## セキュリティ考慮事項

1. **リフレッシュトークンの保護**
   - Firestoreのセキュリティルールで、ユーザー自身のみがアクセス可能にする
   - Cloud Functionsでのみ読み取り可能にする

2. **OAuth 2.0クライアントシークレット**
   - Secret Managerに保存し、Cloud Functionsでのみ使用
   - フロントエンドには公開しない

3. **アクセストークン**
   - Cloud Functions内でのみ使用
   - フロントエンドには送信しない

## 参考リンク

- [Google OAuth 2.0 認証](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API 認証](https://developers.google.com/drive/api/guides/about-auth)
- [Firebase Auth と Google OAuth 2.0 の統合](https://firebase.google.com/docs/auth/web/google-signin)
