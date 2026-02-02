# CLAUDE.md

このファイルは、このプロジェクトでClaude Codeが作業を行う際のガイドラインを含んでいます。

## ⚠️ 重要: プロジェクトルールとガイドライン

**ユーザーリクエストを実行する前に、常に以下のプロジェクトガイドラインに従ってください:**

1. **このファイル (CLAUDE.md)** - プロジェクト全体のガイドライン、セットアップ手順、開発ルールを含む

**主要ガイドライン:**

- タスク計画と進捗管理にTodoWriteツールを積極的に活用
- 以下に示す開発ワークフローフェーズに従う
- 利用可能な場合はMCPツール（Serena、Kiri、Chrome DevTools等）を使用
- 完了前に徹底的なテストと検証を実行
- プロジェクト固有のコーディング規約とパターンに従う

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
- **Formatter**: Use `oxfmt`
- **Linter**: Use `next lint`
- **Naming conventions**:
  - Components: PascalCase
  - Functions and variables: camelCase
  - Constants: UPPER_SNAKE_CASE

### Code Formatting

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

### Lint

```bash
npm run lint
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

- 型チェックを実行: `bun run type-check`
- リントを実行: `bun run lint`
- テストを実行: `bun run test`
- 必要に応じてブラウザ検証にChrome DevTools MCPを使用

**5. コミットとデプロイフェーズ**

- `git status`と`git diff`で変更を確認
- コミットメッセージ規約に従って論理的なコミットを作成
- ビルドをテスト: `bun run build`
- PR/Issue関連の操作にはGitHub CLIを使用: `gh pr list`, `gh issue view`

### タスク管理のベストプラクティス

- **複数ステップのタスクには常にTodoWriteを使用**
- **各ステップ完了後、即座にtodoを完了としてマーク**
- **複雑なタスクを小さく管理可能な部分に分割**
- **ユーザーに情報を提供するため定期的に進捗を更新**
- **エラーを延期するのではなく即座に処理**

## テスト手順

現在、テストスイートは実装されていません。機能を追加する際は、適切なテストを追加してください。

## ビルドコマンド

```bash
# フロントエンドビルド
npm run build

# Cloud Functionsビルド
npm run functions:build
```

## デプロイコマンド

```bash
# Firestoreルールとインデックスをデプロイ
firebase deploy --only firestore:rules,firestore:indexes

# Cloud Functionsをデプロイ
npm run functions:deploy

# 個別デプロイ
npm run functions:deploy:timer
npm run functions:deploy:drive
npm run functions:deploy:github
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

セットアップには以下が含まれます：

- 依存関係のインストール
- 環境変数の設定
- Firebase CLIの設定
- Git Hooksの設定
- 開発サーバーの起動
- Serena MCPオンボーディング（AIエージェント用）
