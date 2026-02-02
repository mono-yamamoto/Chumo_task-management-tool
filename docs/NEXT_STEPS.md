# 次のステップ：ユーザーが行うべき作業チェックリスト

> **GCP Secret Managerがわからない場合**: `docs/GCP_SECRET_MANAGER_EXPLAINED.md` を参照してください。

## Phase 1: GCP Secret Manager設定（必須）

### 1-1. GCP Secret Manager API有効化

1. [GCP Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト `chumo-3506a` を選択
3. 「APIとサービス」→「ライブラリ」を開く
4. 「Secret Manager API」を検索して有効化

### 1-2. Secrets作成

以下のSecretsをGCP Secret Managerに作成してください：

> **Secretsの作成方法がわからない場合**: `docs/HOW_TO_CREATE_SECRETS.md` を参照してください。

**作成方法**: GCP Console（Web UI）またはgcloud CLIのどちらでも作成できます。初心者の方はGCP Consoleがおすすめです。

#### `MAKE_WEBHOOK_SECRET`

- **用途**: Make Webhookの署名検証用
- **値**: Makeで設定したWebhook秘密鍵（任意の文字列、例: `your-secret-key-12345`）
- **作成コマンド**:

```bash
echo -n "your-secret-key-12345" | gcloud secrets create MAKE_WEBHOOK_SECRET --data-file=- --project=chumo-3506a
```

#### `DRIVE_PARENT_ID`

- **用途**: Google Driveの親フォルダID
- **値**: `14l_ggl_SBo8FxZFDOKnmN7atbmaG-Rdh`（仕様書で確定済み）
- **作成コマンド**:

```bash
echo -n "14l_ggl_SBo8FxZFDOKnmN7atbmaG-Rdh" | gcloud secrets create DRIVE_PARENT_ID --data-file=- --project=chumo-3506a
```

#### `CHECKSHEET_TEMPLATE_ID`

- **用途**: チェックシートテンプレートのID
- **値**: `1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M`（仕様書で確定済み）
- **作成コマンド**:

```bash
echo -n "1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M" | gcloud secrets create CHECKSHEET_TEMPLATE_ID --data-file=- --project=chumo-3506a
```

#### `GITHUB_TOKEN`

- **用途**: GitHub API認証用
- **値**: GitHub Personal Access Token（`repo`権限が必要）
- **作成手順**:
  1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. 「Generate new token (classic)」をクリック
  3. Note: `chumo-task-management` など
  4. Expiration: 適切な期間を選択
  5. Scopes: `repo` にチェック
  6. 「Generate token」をクリック
  7. 表示されたトークンをコピー（再表示不可のため注意）
- **作成コマンド**:

```bash
echo -n "ghp_your_token_here" | gcloud secrets create GITHUB_TOKEN --data-file=- --project=chumo-3506a
```

- **⚠️ 重要**: GitHubトークンには有効期限があります。期限切れ時の再登録手順は `docs/GITHUB_TOKEN_RENEWAL.md` を参照してください。

#### `DRIVE_SERVICE_ACCOUNT_KEY`

- **用途**: Google Drive API認証用（サービスアカウントのJSONキー）
- **作成手順**:
  1. GCP Console → 「IAMと管理」→「サービスアカウント」
  2. 「サービスアカウントを作成」をクリック
  3. サービスアカウント名: `drive-service-account`
  4. 「作成して続行」→「完了」
  5. 作成したサービスアカウントをクリック
  6. 「キー」タブ →「キーを追加」→「新しいキーを作成」
  7. キーのタイプ: JSON
  8. 「作成」をクリック（JSONファイルがダウンロードされる）
  9. JSONファイルの内容をコピー
- **作成コマンド**:

```bash
cat /path/to/service-account-key.json | gcloud secrets create DRIVE_SERVICE_ACCOUNT_KEY --data-file=- --project=chumo-3506a
```

### 1-3. Cloud FunctionsにSecretsアクセス権限付与

> **権限付与の手順がわからない場合**: `docs/HOW_TO_GRANT_SECRET_ACCESS.md` を参照してください。

```bash
# Cloud FunctionsのサービスアカウントにSecrets読み取り権限を付与
PROJECT_NUMBER=$(gcloud projects describe chumo-3506a --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding MAKE_WEBHOOK_SECRET \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=chumo-3506a

gcloud secrets add-iam-policy-binding DRIVE_PARENT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=chumo-3506a

gcloud secrets add-iam-policy-binding CHECKSHEET_TEMPLATE_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=chumo-3506a

gcloud secrets add-iam-policy-binding GITHUB_TOKEN \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=chumo-3506a

gcloud secrets add-iam-policy-binding DRIVE_SERVICE_ACCOUNT_KEY \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=chumo-3506a
```

---

## Phase 2: Google Drive API設定（必須）

### 2-1. Google Drive API有効化

1. GCP Console → 「APIとサービス」→「ライブラリ」
2. 「Google Drive API」を検索して有効化
3. 「Google Sheets API」も有効化（チェックシート操作のため）

### 2-2. サービスアカウントにDrive権限付与

1. Google Driveで親フォルダ（ID: `14l_ggl_SBo8FxZFDOKnmN7atbmaG-Rdh`）を開く
2. フォルダを右クリック → 「共有」
3. サービスアカウントのメールアドレス（`drive-service-account@chumo-3506a.iam.gserviceaccount.com`）を追加
4. 権限: 「編集者」を選択
5. 「送信」をクリック

### 2-3. チェックシートテンプレートの確認

1. テンプレートID `1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M` のシートが存在するか確認
2. セルマッピングが正しいか確認：
   - `C4` = タイトル
   - `C5` = Backlog URL
   - `C7` = フォルダURL

---

## Phase 3: Cloud Functionsデプロイ（必須）

### 3-1. Functions依存関係インストール

```bash
cd functions
npm install
npm run build
```

### 3-2. Functionsデプロイ

```bash
# プロジェクトルートに戻る
cd ..

# すべてのFunctionsをデプロイ
firebase deploy --only functions

# または個別にデプロイ
firebase deploy --only functions:syncBacklog
firebase deploy --only functions:startTimer
firebase deploy --only functions:stopTimer
firebase deploy --only functions:createDriveFolder
firebase deploy --only functions:createFireIssue
firebase deploy --only functions:getTimeReport
firebase deploy --only functions:exportTimeReportCSV
```

### 3-3. Functions URL確認

デプロイ後、以下のURLが表示されます：

- `https://asia-northeast1-chumo-3506a.cloudfunctions.net/syncBacklog`
- `https://asia-northeast1-chumo-3506a.cloudfunctions.net/startTimer`
- など

このURLを`.env.local`の`NEXT_PUBLIC_FUNCTIONS_URL`に設定してください。

---

## Phase 4: Make Webhook設定（必須）

### 4-1. MakeでWebhook作成

1. Makeで新しいシナリオを作成
2. Backlogモジュールを追加
3. 「Webhook」モジュールを追加
4. Webhook URL: `https://us-central1-chumo-3506a.cloudfunctions.net/syncBacklog`
5. HTTPメソッド: POST
6. 認証: カスタムヘッダー
   - ヘッダー名: `Authorization`
   - ヘッダー値: `Bearer <MAKE_WEBHOOK_SECRETの値>`
7. Webhook秘密鍵をコピー（GCP Secret Managerに保存済みの値と一致させる）

### 4-2. Backlogトリガー設定

1. Backlogモジュールで「課題作成」イベントを選択
2. プロジェクトキーを指定
3. Webhookにデータを送信する設定

---

## Phase 5: 初期データ作成（推奨）

### 5-1. デフォルトラベル作成

Firebase Consoleから手動で作成：

1. Firestore Database → 「データ」タブ
2. `labels`コレクションを作成
3. ドキュメントを追加：
   - `name`: "運用"
   - `color`: "#3b82f6"
   - `projectId`: 作成したプロジェクトのID
   - `createdAt`: 現在の日時
   - `updatedAt`: 現在の日時

### 5-2. プロジェクトにデフォルトラベルIDを設定

作成したプロジェクトのドキュメントを編集：

- `driveParentId`: `14l_ggl_SBo8FxZFDOKnmN7atbmaG-Rdh`（既に設定済みの可能性あり）

---

## Phase 6: 動作確認（必須）

### 6-1. プロジェクト作成テスト

1. `/projects` にアクセス
2. 「新規作成」をクリック
3. プロジェクト名を入力して作成
4. 一覧に表示されることを確認

### 6-2. タスク作成テスト

1. `/tasks` にアクセス
2. プロジェクトを選択
3. 「新規作成」をクリック（実装が必要な場合）
4. タスクが作成できることを確認

### 6-3. タイマー機能テスト

1. `/tasks` でタスクを選択
2. 「開始」ボタンをクリック
3. タイマーが開始されることを確認
4. 「停止」ボタンをクリック
5. セッションが保存されることを確認

### 6-4. Drive連携テスト

1. タスク詳細ページで「Drive」ボタンをクリック
2. Google Driveにフォルダが作成されることを確認
3. チェックシートが作成されることを確認

### 6-5. Fire連携テスト

1. タスク詳細ページで「Fire」ボタンをクリック
2. GitHub Issueが作成されることを確認
3. `monosus/ss-fire-design-system` リポジトリにIssueが表示されることを確認

---

## Phase 7: 未実装機能の確認

以下の機能は実装されていません。必要に応じて実装してください：

1. **タスク新規作成画面** (`/tasks/new`)
2. **タスク編集機能の完全実装**（一部実装済み）
3. **プロジェクトメンバー管理**（追加・削除）
4. **ラベル管理画面の完全実装**（CRUD操作）
5. **エラーハンドリングの強化**（トースト通知など）
6. **ローディング状態の改善**
7. **レスポンシブ対応の確認**

---

## 優先順位

1. **最優先**: Phase 1（GCP Secret Manager設定）
2. **優先**: Phase 2（Google Drive API設定）
3. **優先**: Phase 3（Cloud Functionsデプロイ）
4. **必須**: Phase 4（Make Webhook設定）
5. **推奨**: Phase 5（初期データ作成）
6. **必須**: Phase 6（動作確認）

---

## トラブルシューティング

### Secretsが読み込めない場合

- Cloud Functionsのサービスアカウントに権限が付与されているか確認
- Secret名が正確か確認（大文字小文字を区別）

### Google Drive APIエラー

- サービスアカウントにフォルダの共有権限が付与されているか確認
- Google Drive APIとGoogle Sheets APIが有効化されているか確認
- **容量不足エラーが出る場合**: `docs/DRIVE_PERMISSION_CHECK.md` を参照して、サービスアカウントが親フォルダに「編集者」権限を持っているか確認してください

### Cloud Functionsデプロイエラー

> **ログの確認方法がわからない場合**: `docs/CLOUD_FUNCTIONS_LOGS.md` を参照してください。

- `functions/package.json`の依存関係が正しいか確認
- Node.js 24が使用されているか確認
- ビルドエラーがないか確認（`npm run build`）
