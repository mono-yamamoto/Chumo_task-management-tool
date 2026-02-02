# セットアップガイド

このドキュメントは、Chumoタスク管理ツールのローカル開発環境をセットアップするためのガイドです。

## 前提条件

Firebase、GCP、Cloud Functionsなどのインフラストラクチャは既に管理者によって設定済みです。開発者は開発を開始するためにローカル開発環境をセットアップするだけで済みます。

## 1. 依存関係のインストール

```bash
# ルートの依存関係をインストール
npm install

# Functionsの依存関係をインストール
cd functions && npm install && cd ..
```

## 2. 環境変数の設定

**⚠️ 重要: このステップは手動でのユーザーアクションが必要です。**

`.env.local` ファイルが存在しない場合は、プロジェクトルートに作成してください。

**環境変数の値は既存の開発者から取得するか、管理者に依頼してください。**

必要な環境変数:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=chumo-3506a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=chumo-3506a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=chumo-3506a.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FUNCTIONS_URL=https://asia-northeast1-chumo-3506a.cloudfunctions.net
```

## 3. Firebase CLIの設定（初回のみ）

```bash
# Firebase CLIがインストールされていない場合
npm install -g firebase-tools

# Firebaseにログイン（初回のみ）
firebase login

# プロジェクトを選択（初回のみ）
firebase use --add
# プロンプトでプロジェクトID "chumo-3506a" を選択
```

## 4. Git Hooks設定（lefthook）

lefthookを使用してコミット前のチェックを自動化しています。

### 前提条件: gitleaksのインストール

機密情報チェックのため、gitleaksが必要です。

```bash
# macOS
brew install gitleaks

# Windows
# https://github.com/gitleaks/gitleaks/releases からダウンロード
# PATHに追加し、gitleaks version で確認
```

### lefthookの自動セットアップ

`npm install` を実行すると、`prepare` スクリプトにより自動的にlefthookがセットアップされます。

```bash
npm install
# → lefthook install が自動実行される
```

### 手動セットアップ（必要な場合のみ）

```bash
npx lefthook install
```

### pre-commitで実行されるチェック

1. **gitleaks**: 機密情報の検出
2. **ESLint**: TypeScript/JavaScriptのリント（自動修正あり）
3. **oxfmt**: コードフォーマット（自動修正あり）

※ステージングされたファイルのみが対象です。
※修正されたファイルは自動的に再ステージングされます。

## 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## 6. GitHub CLIの設定

PRやIssueの確認にGitHub CLIを使用します。

### インストール

```bash
# macOS
brew install gh

# Windows
# https://cli.github.com/ からダウンロードしてインストール
```

### 認証

```bash
# GitHubにログイン
gh auth login
```

インストール確認: `gh --version`

## 7. Serena MCP オンボーディング（AIエージェント用）

**⚠️ 重要: このステップはこのプロジェクトで初めて作業するAIエージェントが実行すべきです。**

Serena MCPを使用するAIエージェントは、プロジェクトで初めて作業を開始する際に、オンボーディングを実行してプロジェクト情報をメモリに保存する必要があります。

AIエージェントが初めてこのプロジェクトで作業する際は、Serena MCPのオンボーディングを実行してください。これにより、プロジェクトの構造、技術スタック、コーディング規約などの情報がメモリに保存され、今後の作業効率が向上します。

### オンボーディング手順（AIエージェントが実行）

1. **オンボーディングの必要性確認**: `mcp__serena__check_onboarding_performed` を使用して既に実行済みかチェック
2. **オンボーディング実行**: 未実行の場合、`mcp__serena__onboarding` でオンボーディングプロセスを開始
3. **プロジェクト情報収集**: エージェントが自動的に以下を収集:
   - プロジェクトの目的と概要
   - 技術スタックと依存関係
   - コードスタイルと規約
   - ディレクトリ構造
   - テスト、フォーマット、リントのコマンド
   - 開発ワークフローとパターン
4. **メモリに保存**: 収集した情報は `.serena/memories/` ディレクトリに保存（このディレクトリはgitで無視される）

**注意**: オンボーディングはプロジェクトごとに一度だけ実行する必要があります。保存されたメモリは、将来のセッションでAIエージェントがプロジェクトコンテキストをより迅速に理解するのに役立ちます。

## トラブルシューティング

### よくある問題と解決方法

- **Firebase CLIエラー**: `firebase login`を再実行してください
- **デプロイエラー**: `firebase use --add`でプロジェクトを再選択してください
- **環境変数エラー**: `.env.local`ファイルが正しく設定されているか確認してください
- **gitleaksエラー**: `gitleaks version`でインストールを確認してください
- **lefthookが動作しない場合**: `npx lefthook install` を再実行してください
- **ESLint/oxfmtエラー**: 修正が必要なエラーの場合は手動で修正後、再コミットしてください

詳細なトラブルシューティングは `docs/operations/TROUBLESHOOTING.md` を参照してください。

## その他の有用な情報

- **ビルドコマンド**: `npm run build` (フロントエンド), `npm run functions:build` (Cloud Functions)
- **デプロイコマンド**: 各種Firebaseサービスのデプロイコマンドが利用可能
- **GitHub CLI使用例**: `gh pr list`, `gh issue view 123`, `gh pr view 456 --comments`
