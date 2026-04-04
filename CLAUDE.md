# CLAUDE.md

このファイルは、このプロジェクトでClaude Codeが作業を行う際のガイドラインを含んでいます。

## 🔄 スタック移行状況（重要 - 必ず最初に読むこと）

**現在このリポジトリには旧環境と新環境が共存しています。**

### 旧環境（Next.js） — 参照用として残存

既存実装の参考としてまだ残しているが、**新規開発は行わない**。

| 項目            | 内容                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| 配置            | ルート直下 (`app/`, `components/`, `hooks/`, `lib/`, `stores/`, `types/`, `utils/`) |
| フレームワーク  | Next.js 16 (App Router)                                                             |
| UI              | MUI v7 + Emotion                                                                    |
| 認証            | Clerk (`@clerk/nextjs`)                                                             |
| DB/バックエンド | Firebase (Firestore + Cloud Functions)                                              |
| 状態管理        | Zustand + TanStack Query                                                            |
| ビルド          | `npm run build` (next build)                                                        |
| 開発サーバー    | `npm run dev` (next dev)                                                            |

### 新環境 — アクティブな開発対象

| 項目           | フロントエンド (`frontend/`)                            | バックエンド (`backend/`)                |
| -------------- | ------------------------------------------------------- | ---------------------------------------- |
| フレームワーク | Vite + React 19                                         | Hono on Cloudflare Workers               |
| UI/スタイル    | Tailwind CSS v4 + React Aria Components + Framer Motion | —                                        |
| 認証           | Clerk (`@clerk/clerk-react`)                            | Clerk (`@clerk/backend`)                 |
| DB             | —                                                       | Neon Postgres + Drizzle ORM              |
| ストレージ     | —                                                       | Cloudflare R2                            |
| ルーティング   | react-router-dom v7                                     | Hono Router                              |
| ビルド         | `cd frontend && bun run build`                          | `cd backend && wrangler deploy`          |
| 開発サーバー   | `cd frontend && bun run dev` (port 3000)                | `cd backend && wrangler dev` (port 8787) |
| テスト         | —                                                       | `cd backend && bun run test` (Vitest)    |

### 開発時の注意事項

- **新規の機能開発・バグ修正は `frontend/` と `backend/` に対して行う**
- 旧環境のコード（ルート直下）は既存実装のロジックやUIパターンを参考にする目的で残している
- 旧環境のファイルを修正・削除する場合は、ユーザーに確認を取ること
- `frontend/` からバックエンドAPIへのプロキシは Vite の設定で `/api` → `localhost:8787` に転送される

## ディレクトリ構造

```
/
├── frontend/                 # 🆕 新フロントエンド（Vite + React 19）
│   └── src/
│       ├── components/
│       │   ├── layout/       #   AppLayout, Header, Sidebar
│       │   ├── shared/       #   TaskDrawer, ReportDrawer, ThemeToggle
│       │   └── ui/           #   Avatar, Badge, Button, Input, Modal, Select, Tabs 等
│       ├── hooks/            #   useDashboardStats, useTaskDrawer, useTheme, useViewMode
│       ├── lib/              #   api, constants, mockData
│       ├── pages/            #   login, dashboard, tasks, reports, contacts, settings
│       │   └── <page>/
│       │       ├── <Page>.tsx       # ページ本体コンポーネント
│       │       └── components/      # そのページ固有のコンポーネント
│       └── types/
│
├── backend/                  # 🆕 新バックエンド（Hono + Cloudflare Workers）
│   └── src/
│       ├── db/               #   Drizzle schema, migrations
│       ├── lib/              #   ビジネスロジック（backlog 等）
│       ├── middleware/       #   auth, db
│       └── routes/           #   tasks, reports, comments, timer, sessions, users 等
│
├── app/                      # 🔒 旧 Next.js App Router（参照用）
│   ├── (auth)/login/
│   └── (dashboard)/          #   dashboard, tasks, reports, settings, contact
├── components/               # 🔒 旧 MUI コンポーネント（参照用）
│   ├── ui/                   #   共通UIパーツ
│   ├── tasks/                #   タスク関連
│   ├── reports/              #   レポート関連
│   ├── settings/             #   設定関連
│   ├── Drawer/               #   ドロワー
│   └── ...
├── hooks/                    # 🔒 旧カスタムフック群（参照用）
├── lib/                      # 🔒 旧ライブラリ（Firebase, API, presentation 等）
├── stores/                   # 🔒 旧 Zustand ストア（参照用）
├── types/                    # 🔒 旧型定義（参照用）
├── utils/                    # 🔒 旧ユーティリティ（参照用）
├── constants/                # 🔒 旧定数定義（参照用）
├── functions/                # 🔒 旧 Cloud Functions（参照用）
│
├── designs/                  # Pencil デザインファイル（.pen）
├── docs/                     # 設計ドキュメント、仕様書、運用手順
├── scripts/                  # データ投入・マイグレーションスクリプト
├── public/                   # 静的アセット（旧環境用）
└── .claude/                  # Claude Code 設定・スキル・ルール
```

- 🆕 = 新環境（アクティブに開発）
- 🔒 = 旧環境（参照用として残存、新規開発禁止）

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

#### Next.js DevTools MCP

開発サーバー用のNext.jsランタイム統合。

**主な機能**:

- ランタイムエラーの検出
- ルート情報と分析
- 開発サーバーの診断
- リアルタイムのビルド状況

## コードスタイル

- **TypeScript**: strict mode enabled
- **Naming conventions**:
  - Components: PascalCase
  - Functions and variables: camelCase
  - Constants: UPPER_SNAKE_CASE

### 新環境 (`frontend/` / `backend/`)

- **Linter**: oxlint (`cd frontend && bun run format`)
- **CSS**: Tailwind CSS v4 のユーティリティクラスを使用
- **コンポーネント**: React Aria Components ベース（`frontend/src/components/ui/`）

```bash
# フロントエンド
cd frontend && bun run lint
cd frontend && bun run type-check

# バックエンド
cd backend && bun run test
```

### 旧環境（ルート直下）— 参照のみ

- **Formatter**: `oxfmt` (`npm run format`)
- **Linter**: `next lint` (`npm run lint`)

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

- フロントエンド型チェック: `cd frontend && bun run type-check`
- フロントエンドリント: `cd frontend && bun run lint`
- バックエンドテスト: `cd backend && bun run test`
- 必要に応じてブラウザ検証にChrome DevTools MCPを使用

**5. コミットとデプロイフェーズ**

- `git status`と`git diff`で変更を確認
- コミットメッセージ規約に従って論理的なコミットを作成
- フロントエンドビルドテスト: `cd frontend && bun run build`
- PR/Issue関連の操作にはGitHub CLIを使用: `gh pr list`, `gh issue view`

### タスク管理のベストプラクティス

- **複数ステップのタスクには常にTodoWriteを使用**
- **各ステップ完了後、即座にtodoを完了としてマーク**
- **複雑なタスクを小さく管理可能な部分に分割**
- **ユーザーに情報を提供するため定期的に進捗を更新**
- **エラーを延期するのではなく即座に処理**

## テスト手順

### 新環境

```bash
# バックエンドテスト（Vitest）
cd backend && bun run test
cd backend && bun run test:coverage
```

フロントエンドのテストスイートは未整備。機能追加時に適切なテストを追加すること。

### 旧環境（参照のみ）

```bash
bun run test          # ルートのVitest
```

## ビルドコマンド

### 新環境

```bash
# フロントエンドビルド
cd frontend && bun run build

# バックエンド（Cloudflare Workers）
cd backend && wrangler deploy
```

### 旧環境（参照のみ）

```bash
npm run build              # Next.js ビルド
npm run functions:build    # Cloud Functions ビルド
```

## デプロイコマンド

### 新環境

```bash
# バックエンドAPI（Cloudflare Workers）
cd backend && wrangler deploy                    # development
cd backend && wrangler deploy --env staging      # staging
cd backend && wrangler deploy --env production   # production

# DBマイグレーション
cd backend && bun run db:generate
cd backend && bun run db:migrate
```

### 旧環境（参照のみ）

```bash
firebase deploy --only firestore:rules,firestore:indexes
npm run functions:deploy
```

## 重要事項

### 手動で必要なステップ

**⚠️ 重要: これらのステップはエージェントが自動で実行できません。ユーザーに日本語で伝えてください。**

**ユーザーに日本語で伝える**: 以下の手順は、エージェントが自動で実行できません。ユーザーに指示を出してください：

1. **環境変数設定**: `.env.local`ファイルの作成と設定値の入力（既存の開発者から取得）
2. **Git Hooks設定**: gitleaksのインストールとpre-commit hookの設定（機密情報の誤コミット防止）

### トラブルシューティング

**トラブルシューティングガイダンスを提供する際は、ユーザーに日本語で伝える**:

- **Firebase CLIエラー**: `firebase login`を再実行してください
- **デプロイエラー**: `firebase use --add`でプロジェクトを再選択してください
- **環境変数エラー**: `.env.local`ファイルが正しく設定されているか確認してください
- **gitleaksエラー**: `gitleaks version`でインストールを確認し、`.git/hooks/pre-commit`に実行権限があるか確認してください（`chmod +x .git/hooks/pre-commit`）

詳細なトラブルシューティングは `docs/operations/TROUBLESHOOTING.md` を参照してください。

## コミットルール

**コミットする際は [commit-rules.md](.claude/rules/commit-rules.md) を参照してください。**

## 初回セットアップ

**初回セットアップについては [SETUP.md](./SETUP.md) を参照してください。**

### 新環境のセットアップ

```bash
# フロントエンド
cd frontend && bun install

# バックエンド
cd backend && bun install

# 開発サーバー起動（2つのターミナルで）
cd frontend && bun run dev   # → http://localhost:3000
cd backend && wrangler dev   # → http://localhost:8787
```

### 旧環境のセットアップ（参照用）

- 依存関係のインストール
- 環境変数の設定
- Firebase CLIの設定
- Git Hooksの設定
- Serena MCPオンボーディング（AIエージェント用）
