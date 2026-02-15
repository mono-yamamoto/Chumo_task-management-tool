# ステージング環境構築プラン

## Context

本番環境（`chumo-3506a`）は稼働中のまま、UIリデザインを安全にテスト・開発するためのステージング環境を構築する。現状は単一Firebaseプロジェクト + Vercel の構成で、環境分離の仕組みがない。

## 全体構成

```
本番: main → Vercel Production + Firebase chumo-3506a
STG:  staging → Vercel Preview + Firebase chumo-staging-xxxxx
```

---

## やることリスト（手動 vs 自動化）

### A. ユーザー手動作業（Firebase/GCP/Vercelコンソール）

#### A-1. Firebase ステージングプロジェクト作成

1. [Firebase Console](https://console.firebase.google.com) で新プロジェクト作成（例: `chumo-staging`）
2. Blazeプラン（従量課金）に切替（Cloud Functions に必要）
3. Firestore 有効化（リージョン: `asia-northeast1`）
4. Authentication 有効化 → Googleプロバイダー ON
5. Cloud Storage 有効化
6. Webアプリ登録 → **SDK設定値をメモ**（apiKey, authDomain, projectId 等6つ）

#### A-2. GCP OAuth + シークレット設定

1. GCPコンソール > APIs & Services > OAuth同意画面を設定
2. OAuth 2.0 クライアントID 作成（リダイレクトURI: `https://<staging-domain>/api/auth/google/callback`）
3. サービスアカウント鍵(JSON)を生成 → `client_email` / `private_key` メモ
4. Secret Manager で以下8つのシークレット作成（Chat/Drive/GitHub連携は本番と同じ値を使用）:
   - `GOOGLE_CHAT_WEBHOOK_URL`, `GOOGLE_CHAT_SPACE_URL`（本番と同じ値）
   - `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`（ステージング用OAuth）
   - `DRIVE_PARENT_ID`, `CHECKSHEET_TEMPLATE_ID`（本番と同じ値）
   - `APP_ORIGIN`（ステージングURL）
   - `GITHUB_TOKEN`（本番と同じ値）
5. Cloud Functions サービスアカウントに `Secret Manager Secret Accessor` ロール付与

#### A-3. Vercel ステージング設定

1. Vercelダッシュボード > Settings > Environment Variables
2. Environment: **Preview** (Branch: `staging`) で以下を全て設定:
   - `NEXT_PUBLIC_FIREBASE_*` 6個（A-1でメモした値）
   - `NEXT_PUBLIC_FUNCTIONS_URL`（`https://asia-northeast1-<staging-project-id>.cloudfunctions.net`）
   - `NEXT_PUBLIC_FUNCTION_CREATEGOOGLECHATTHREAD_URL`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   - `GOOGLE_OAUTH_*` 3個
3. （任意）Settings > Domains でステージング用カスタムドメイン設定

#### A-4. GitHub Secrets

1. リポジトリ Settings > Secrets and variables > Actions
2. `FIREBASE_STAGING_SA_KEY` にサービスアカウントJSON鍵を設定

---

### B. エージェント自動化作業（コード変更）

#### B-1. `.firebaserc` 新規作成

```json
{
  "projects": {
    "production": "chumo-3506a",
    "staging": "<staging-project-id>"
  }
}
```

- ステージングのproject IDはユーザーに確認後に記入

#### B-2. `lib/firebase/admin.ts` ハードコード除去

- **ファイル**: `lib/firebase/admin.ts:12-15`
- `'chumo-3506a'` のフォールバックを削除し、環境変数必須に変更
- これにより、環境変数未設定時に本番DBへ誤接続するリスクを排除

#### B-3. `.env.example` 新規作成

- 全環境変数の一覧テンプレート（値なし）をGit管理
- `.gitignore` に `.env.staging` を追加

#### B-4. シーディングスクリプトの `.env` パス柔軟化

- **対象ファイル**: `scripts/` 配下の全6スクリプト
- `config({ path: resolve(__dirname, '../.env.local') })` を環境変数 `DOTENV_CONFIG_PATH` 対応に修正
- ステージングへのデータ投入時に `.env.staging` を指定可能にする

#### B-5. `package.json` にステージング用スクリプト追加

```json
"firebase:use:staging": "firebase use staging",
"firebase:use:production": "firebase use production",
"staging:deploy:rules": "firebase use staging && firebase deploy --only firestore:rules,firestore:indexes,storage",
"staging:deploy:functions": "firebase use staging && cd functions && npm run build && cd .. && firebase deploy --only functions",
"staging:deploy:all": "npm run staging:deploy:rules && npm run staging:deploy:functions"
```

#### B-6. `.github/workflows/deploy-staging.yml` 新規作成

- `staging` ブランチ push 時に自動デプロイ
- Firestore rules/indexes + Storage rules + Cloud Functions を一括デプロイ

---

## 実施順序

| 順番 | 作業                                   | 担当                     |
| ---- | -------------------------------------- | ------------------------ |
| 1    | Firebaseプロジェクト作成 + 各種有効化  | ユーザー (A-1)           |
| 2    | GCP OAuth + Secret Manager設定         | ユーザー (A-2)           |
| 3    | コード変更（B-1〜B-6）                 | エージェント             |
| 4    | Vercel環境変数設定                     | ユーザー (A-3)           |
| 5    | GitHub Secrets設定                     | ユーザー (A-4)           |
| 6    | Firebase CLI でステージングにデプロイ  | エージェント or ユーザー |
| 7    | シーディングスクリプトで初期データ投入 | エージェント or ユーザー |
| 8    | `staging` ブランチ作成 + push          | エージェント             |
| 9    | 動作検証                               | ユーザー                 |

---

## 検証方法

1. ステージングURLにアクセス → ログイン画面表示を確認
2. Googleログインフロー完了を確認
3. タスクCRUD操作の動作確認
4. Cloud Functions（タイマー等）の動作確認
5. `firebase use production` に戻して本番に影響がないことを確認

---

## 注意点

- **Cloud Functions のリージョン**: `NEXT_PUBLIC_FUNCTIONS_URL` は `asia-northeast1` を指す。本番と同じ構成なので問題なし
- **Google Chat/Drive/GitHub連携**: 本番と同じ値を使用。ステージングからの操作が本番のChat/Drive/GitHubに反映される点に注意
- **FCM VAPID Key**: Cloud Messaging使用時はステージングで別途生成が必要
- **`.env.staging` の共有**: Git管理しないので、チーム共有方法を別途決めておく
