# CLAUDE.md

このファイルは、このプロジェクトでClaude Codeが作業を行う際のガイドラインを含んでいます。

## テックスタック

| 項目           | フロントエンド (`frontend/`)                            | バックエンド (`backend/`)   |
| -------------- | ------------------------------------------------------- | --------------------------- |
| フレームワーク | Vite + React 19                                         | Hono on Cloudflare Workers  |
| UI/スタイル    | Tailwind CSS v4 + React Aria Components + Framer Motion | —                           |
| 認証           | Clerk (`@clerk/clerk-react`)                            | Clerk (`@clerk/backend`)    |
| DB             | —                                                       | Neon Postgres + Drizzle ORM |
| ストレージ     | —                                                       | Cloudflare R2               |
| ルーティング   | react-router-dom v7                                     | Hono Router                 |
| ビルド         | `bun run build`                                         | `bun run backend:deploy`    |
| 開発サーバー   | `bun run dev`（フロント+バック同時起動）                | —                           |
| テスト         | —                                                       | `bun run test` (Vitest)     |

## ディレクトリ構造

```
/
├── frontend/                 # フロントエンド（Vite + React 19）
│   └── src/
│       ├── components/
│       │   ├── layout/       #   AppLayout, Header, Sidebar
│       │   ├── shared/       #   TaskDrawer, ReportDrawer, ThemeToggle
│       │   └── ui/           #   Avatar, Badge, Button, Input, Modal, Select, Tabs 等
│       ├── hooks/            #   useDashboardStats, useTaskDrawer, useTheme, useViewMode
│       ├── lib/              #   api, constants
│       ├── pages/            #   login, dashboard, tasks, reports, contacts, settings
│       │   └── <page>/
│       │       ├── <Page>.tsx       # ページ本体コンポーネント
│       │       └── components/      # そのページ固有のコンポーネント
│       └── types/
│
├── backend/                  # バックエンド（Hono + Cloudflare Workers）
│   └── src/
│       ├── db/               #   Drizzle schema, migrations
│       ├── lib/              #   ビジネスロジック（backlog 等）
│       ├── middleware/       #   auth, db
│       └── routes/           #   tasks, reports, comments, timer, sessions, users 等
│
├── designs/                  # Pencil デザインファイル（.pen）
├── docs/                     # 設計ドキュメント、仕様書、運用手順
├── scripts/                  # DB同期スクリプト
└── .claude/                  # Claude Code 設定・スキル・ルール
```

## ⚠️ Bash コマンド実行ルール

- **`cd` を使わない**。ルート `package.json` にフロント・バック両方のコマンドが定義済みなので、プロジェクトルートから直接実行する
- `git` コマンドも `cd` なしで直接実行する（cwd は常にプロジェクトルート）

```bash
# ✅ ルートの package.json 経由で実行
bun run test              # → backend テスト
bun run lint              # → frontend + backend lint
bun run type-check        # → frontend 型チェック
bun run build             # → frontend ビルド
bun run backend:db:generate  # → Drizzle マイグレーション生成
bun run backend:db:migrate   # → Drizzle マイグレーション適用

# ❌ cd を使わない
cd frontend && bun run test
cd /absolute/path && git status
```

## ⚠️ 重要: プロジェクトルールとガイドライン

**ユーザーリクエストを実行する前に、常に以下のプロジェクトガイドラインに従ってください:**

1. **このファイル (CLAUDE.md)** - プロジェクト全体のガイドライン、セットアップ手順、開発ルールを含む

**主要ガイドライン:**

- タスク計画と進捗管理にTodoWriteツールを積極的に活用
- 以下に示す開発ワークフローフェーズに従う
- 利用可能な場合はMCPツール（Serena、Kiri、Chrome DevTools等）を使用
- 完了前に徹底的なテストと検証を実行
- プロジェクト固有のコーディング規約とパターンに従う
- **フロントエンド実装時は `frontend/src/components/ui/` の共通コンポーネント（Button, Avatar, Modal, Select 等）を最初に調査し、既存コンポーネントが使える場合は必ずそれを使うこと。独自にスタイルを書く前にまず共通UIを確認する。**

### ⚠️ 必須: タスク計画と進捗追跡

**Claude Codeはタスク管理にTodoWriteツールを必ず使用する必要があります:**

1. **タスク計画**: 複数ステップのタスクの開始時にtodoを作成
2. **進捗追跡**: 作業の進行に応じてtodoをin_progress → completedにマーク
3. **変更タイプ**: 実装する変更の種類を明確に記述

**ワークフローの例:**

```text
要求された機能を実装します。進捗を追跡するためのtodoリストを作成することから始めます。

[調査、計画、実装、テスト、検証のtodoを作成]

実装タイプ: **新機能追加** - ユーザー認証機能の追加

[実装開始...]
```

## TodoWriteを使用したタスク計画

複雑な機能の実装や大規模なリファクタリングを行う際は、タスク管理にTodoWriteツールを使用してください。

**TodoWriteを使用すべき場合**:

- 複数ファイルにまたがる機能追加
- アーキテクチャ変更や大規模リファクタリング
- 複数ステップの機能実装
- 外部ライブラリやAPIの統合
- データベーススキーマの変更やマイグレーション
- 3つ以上のステップが必要なタスク

**TodoWriteが提供するもの**:

- 明確なタスク分割と進捗追跡
- 実装進捗のユーザーへの可視化
- 複雑な変更に対する体系的アプローチ
- ステップや要件の見落とし防止

## 利用可能なMCPツール

Claude Codeは開発効率を向上させるために、いくつかのMCPツールにアクセスできます:

#### Serena MCP

効率的なコード読み取りと編集のためのMCPツール。

**主な機能**:

- シンボルベースのコード検索と編集
- 正確な関数、クラス、メソッドの変更
- コードリファクタリングサポート
- プロジェクトコンテキストのメモリ管理

#### Chrome DevTools MCP

効率的なブラウザベースの検証のためのMCPツール。

**主な機能**:

- ページスナップショットのキャプチャ
- コンソールエラーのチェック
- ネットワークリクエストの検証
- UIの動作検証
- パフォーマンステスト

#### Kiri MCP

高度なコードベース検索とコンテキスト抽出。

**主な機能**:

- 関連性ランキングによるセマンティック検索
- 依存関係分析とクロージャ追跡
- 関連するコードスニペットのコンテキストバンドリング
- ファイルとシンボルの検索機能

## コードスタイル

- **TypeScript**: strict mode enabled
- **Naming conventions**:
  - Components: PascalCase
  - Functions and variables: camelCase
  - Constants: UPPER_SNAKE_CASE
- **Linter**: oxlint (`bun run frontend:format`)
- **CSS**: Tailwind CSS v4 のユーティリティクラスを使用
- **コンポーネント**: React Aria Components ベース（`frontend/src/components/ui/`）

```bash
# すべてプロジェクトルートから実行
bun run lint          # フロントエンド + バックエンド lint
bun run type-check    # フロントエンド + バックエンド型チェック
bun run test          # バックエンドテスト
```

## Claude Codeでの開発ワークフロー

### 推奨開発プロセス

**1. 調査フェーズ**

- コードベース探索にKiri MCPを使用: `mcp__kiri__context_bundle`
- 関連コードを検索: `mcp__kiri__files_search`
- 依存関係を分析: `mcp__kiri__deps_closure`

**2. 計画フェーズ**

- TodoWriteツールを使用してタスクの分割を作成
- 実装ステップと依存関係を計画
- 変更が必要なファイルとコンポーネントを特定

**3. 実装フェーズ**

- コード変更にSerena MCPを使用: `mcp__serena__replace_symbol_body`
- 既存のパターンと規約に従う
- TodoWriteの進捗追跡で段階的な変更を実施

**4. テストと検証フェーズ**

- フロントエンド型チェック: `bun run type-check`
- フロントエンドリント: `bun run lint`
- バックエンドテスト: `bun run test`
- 必要に応じてブラウザ検証にChrome DevTools MCPを使用

**5. コミットとデプロイフェーズ**

- `git status`と`git diff`で変更を確認
- コミットメッセージ規約に従って論理的なコミットを作成
- フロントエンドビルドテスト: `bun run build`
- PR/Issue関連の操作にはGitHub CLIを使用: `gh pr list`, `gh issue view`

### タスク管理のベストプラクティス

- **複数ステップのタスクには常にTodoWriteを使用**
- **各ステップ完了後、即座にtodoを完了としてマーク**
- **複雑なタスクを小さく管理可能な部分に分割**
- **ユーザーに情報を提供するため定期的に進捗を更新**
- **エラーを延期するのではなく即座に処理**

## テスト手順

```bash
# バックエンドテスト（Vitest）
bun run test
bun run backend:test:coverage
```

フロントエンドのテストスイートは未整備。機能追加時に適切なテストを追加すること。

## ビルドコマンド

```bash
# フロントエンドビルド
bun run build

# バックエンドデプロイ（Cloudflare Workers）
bun run backend:deploy
```

## デプロイコマンド

```bash
# バックエンドAPI（Cloudflare Workers）
bun run backend:deploy                           # development（デフォルト）
cd backend && wrangler deploy --env staging      # staging（ルートスクリプト未定義）
cd backend && wrangler deploy --env production   # production（ルートスクリプト未定義）

# DBマイグレーション
bun run backend:db:generate
bun run backend:db:migrate
```

## 重要事項

### 手動で必要なステップ

**⚠️ 重要: これらのステップはエージェントが自動で実行できません。ユーザーに日本語で伝えてください。**

1. **環境変数設定**: `.env.local`ファイルの作成と設定値の入力（既存の開発者から取得）
2. **Git Hooks設定**: gitleaksのインストールとpre-commit hookの設定（機密情報の誤コミット防止）

### トラブルシューティング

- **環境変数エラー**: `.env.local`ファイルが正しく設定されているか確認してください
- **gitleaksエラー**: `gitleaks version`でインストールを確認し、`.git/hooks/pre-commit`に実行権限があるか確認してください（`chmod +x .git/hooks/pre-commit`）

詳細なトラブルシューティングは `docs/operations/TROUBLESHOOTING.md` を参照してください。

## コミットルール

**コミットする際は [commit-rules.md](.claude/rules/commit-rules.md) を参照してください。**

## 初回セットアップ

**初回セットアップについては [SETUP.md](./SETUP.md) を参照してください。**

```bash
# 依存関係インストール（frontend/ と backend/ それぞれ）
cd frontend && bun install
cd backend && bun install

# 開発サーバー起動（フロント+バック同時起動）
bun run dev   # → frontend: http://localhost:3000, backend: http://localhost:8787
```
