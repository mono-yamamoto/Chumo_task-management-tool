# セットアップガイド

このドキュメントは、Chumoタスク管理ツールのローカル開発環境をセットアップするためのガイドです。

## 前提条件

- [Bun](https://bun.sh/) がインストールされていること
- [Docker](https://www.docker.com/) がインストールされていること（ローカルDB用���
- [gitleaks](https://github.com/gitleaks/gitleaks) がインストールされていること（機密情報チェック用）

## 1. 依存関係のインストール

```bash
# ルートの依存関係をインストール（lefthookも自動セットアップ）
bun install

# フロントエンドの依存関係をインストール
cd frontend && bun install

# バックエンドの依存関係をインストール
cd backend && bun install
```

## 2. 環境変数の設定

**⚠️ 重要: このステップは手動でのユーザーアクションが必要です。**

プロジェクトルートに `.env.local` ファイルを作成してください。
環境変数の値は既存の開発者から取得するか、管理者に依頼してください。

必要な環境変数:

```env
# Clerk 認証
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key

# Neon Database
DATABASE_URL=your_neon_database_url

# Cloudflare R2
R2_ACCESS_KEY_ID=your_r2_key
R2_SECRET_ACCESS_KEY=your_r2_secret
```

## 3. Git Hooks設定（lefthook）

lefthookを使用してコミット前のチェックを自動化しています。

### 前提条件: gitleaksのインストール

```bash
# macOS
brew install gitleaks

# Windows
# https://github.com/gitleaks/gitleaks/releases からダウンロード
```

### lefthookの自動セットアップ

`bun install` を実行すると、`prepare` スクリプトによ���自動的にlefthookがセットアップされます。

### pre-commitで実行されるチェック

1. **gitleaks**: 機密情報の検出
2. **ESLint**: TypeScript/JavaScriptのリント（自動修正あり）
3. **oxfmt**: コードフォーマット（自動修正あり）

## 4. 開発サーバーの起動

```bash
# フロントエンド + ��ックエンド同時起動
bun run dev
```

- フロントエンド: `http://localhost:3000`
- バックエンド: `http://localhost:8787`

## 5. GitHub CLIの設定

PRやIssueの確認にGitHub CLIを使用します。

```bash
# macOS
brew install gh

# 認証
gh auth login
```

## コマンド一覧

```bash
bun run dev               # フロント+バック同時起動
bun run build             # フロントエンドビルド
bun run lint              # フロントエンドlint
bun run type-check        # フロントエンド型チェック
bun run test              # バックエンドテスト
bun run backend:deploy    # バックエンドデプロイ
bun run backend:db:generate  # Drizzle マイグレーション生成
bun run backend:db:migrate   # Drizzle マイグレーション適用
```

## トラブルシューティング

- **環境変数エラー**: `.env.local`ファイルが正しく設定されているか確認
- **gitleaksエラー**: `gitleaks version`でインストールを確認
- **lefthookが動作しない**: `npx lefthook install` を再実行
- **Dockerエラー**: `docker compose up -d postgres` でDBが起動するか確認

詳細は `docs/operations/TROUBLESHOOTING.md` を参照してください。
