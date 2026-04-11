# Backlog Webhook シークレット設定

Backlog からの Webhook リクエストを認証するための共有シークレットの設定手順。

## 背景

`/api/backlog/webhook` エンドポイントは Clerk JWT 認証をスキップし、代わりに共有シークレットで Webhook リクエストを検証する。シークレットが未設定または不一致の場合、リクエストは `401 Unauthorized` で拒否される。

## 検証の仕組み

バックエンドは以下の順で共有シークレットを探す:

1. リクエストヘッダー `X-Backlog-Webhook-Secret`
2. クエリパラメータ `?secret=`

いずれかが環境変数 `BACKLOG_WEBHOOK_SECRET` と一致すれば認証成功。

## 設定手順

### 1. シークレット値の生成

```bash
openssl rand -hex 32
```

生成された値を控えておく（Cloudflare と Backlog の両方で使う）。

### 2. Cloudflare Workers への設定

```bash
# development（デフォルト）
cd backend && npx wrangler secret put BACKLOG_WEBHOOK_SECRET

# staging
cd backend && npx wrangler secret put BACKLOG_WEBHOOK_SECRET --env staging

# production
cd backend && npx wrangler secret put BACKLOG_WEBHOOK_SECRET --env production
```

プロンプトが表示されたら、手順1で生成した値を貼り付ける。

### 3. ローカル開発環境への設定

`backend/.dev.vars` に追加:

```
BACKLOG_WEBHOOK_SECRET=ローカル開発用の任意の値
```

### 4. Backlog 側の設定

Backlog の Webhook 設定画面で、Webhook URL にクエリパラメータとしてシークレットを付与する:

```
https://<your-worker-domain>/api/backlog/webhook?secret=<手順1で生成した値>
```

> **補足**: Backlog はカスタムヘッダーの設定に対応していないため、クエリパラメータ方式を使用する。

## 環境別の設定状況確認

```bash
# 設定されているシークレット一覧を確認
cd backend && npx wrangler secret list
cd backend && npx wrangler secret list --env staging
cd backend && npx wrangler secret list --env production
```

## 関連ファイル

| ファイル                         | 役割                                              |
| -------------------------------- | ------------------------------------------------- |
| `backend/src/middleware/auth.ts` | Webhook パスの Clerk 認証スキップ定義             |
| `backend/src/routes/backlog.ts`  | Webhook ハンドラ内でのシークレット検証            |
| `backend/src/index.ts`           | `BACKLOG_WEBHOOK_SECRET` の型定義（Env.Bindings） |
