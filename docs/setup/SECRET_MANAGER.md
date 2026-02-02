# GCP Secret Managerとは

## 概要

**GCP Secret Manager**は、Google Cloud Platform（GCP）が提供する**機密情報（パスワード、APIキー、トークンなど）を安全に保存・管理するサービス**です。

## なぜ必要？

Cloud Functionsで以下のような機密情報を使う必要があります：

- Make Webhookの秘密鍵
- GitHub APIのトークン
- Google Drive APIのサービスアカウントキー

これらの情報を**コードに直接書くのは危険**です。GitHubにコミットしてしまうと、誰でも見れてしまいます。

Secret Managerを使うと：

- ✅ 機密情報を安全に保存できる
- ✅ コードから分離できる
- ✅ アクセス権限を細かく制御できる
- ✅ ローテーション（更新）が簡単

## 基本的な使い方

### 1. Secretを作成

```bash
# 例：GitHubトークンを保存
echo -n "ghp_your_token_here" | gcloud secrets create GITHUB_TOKEN --data-file=-
```

### 2. Secretを読み取る（Cloud Functionsから）

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();
const [version] = await secretClient.accessSecretVersion({
  name: `projects/${projectId}/secrets/GITHUB_TOKEN/versions/latest`,
});
const token = version.payload?.data?.toString();
```

## このプロジェクトでの使用例

### 保存する情報

1. **MAKE_WEBHOOK_SECRET**: Makeから送られてくるWebhookの署名検証用
2. **DRIVE_PARENT_ID**: Google Driveの親フォルダID
3. **CHECKSHEET_TEMPLATE_ID**: チェックシートテンプレートのID
4. **GITHUB_TOKEN**: GitHub APIを呼び出すためのトークン
5. **DRIVE_SERVICE_ACCOUNT_KEY**: Google Drive APIを呼び出すための認証情報（JSON形式）

### なぜこれらをSecret Managerに保存するか

- **セキュリティ**: コードに直接書かないため、GitHubに漏洩しない
- **管理のしやすさ**: トークンを更新する際、コードを変更せずにSecretだけ更新できる
- **権限管理**: 誰がどのSecretにアクセスできるかを細かく制御できる

## 料金

- **無料枠**: 月6回のアクセスまで無料
- **有料**: それ以上は1アクセスあたり$0.06（非常に安い）
- このプロジェクトでは、Cloud Functionsが実行されるたびにアクセスするので、使用量に応じて課金されますが、通常は月数ドル程度です

## 代替案（非推奨）

Secret Managerを使わない場合：

- ❌ 環境変数に直接書く（コードに含まれる可能性がある）
- ❌ ハードコードする（GitHubに漏洩する）
- ❌ 別のサービスを使う（管理が複雑になる）

## まとめ

**GCP Secret Manager = 機密情報を安全に保存する金庫のようなもの**

Cloud Functionsで外部API（GitHub、Google Driveなど）を使うために必要な認証情報を、安全に保存・管理するためのサービスです。
