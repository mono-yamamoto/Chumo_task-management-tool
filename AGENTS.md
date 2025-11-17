# AGENTS.md

このファイルは、AIコーディングエージェントがこのプロジェクトで作業する際のガイドラインです。

## Setup commands

### 開発環境のセットアップ

**前提条件**: Firebase、GCP、Cloud Functionsなどのインフラは既に管理者が設定済みです。
開発者はローカル開発環境を構築するだけで開発を始められます。

#### 1. 依存関係のインストール

```bash
# ルートの依存関係をインストール
npm install

# Functionsの依存関係をインストール
cd functions && npm install && cd ..
```

#### 2. 環境変数の設定

`.env.local`ファイルが存在しない場合、プロジェクトルートに作成してください。

既存の開発者から環境変数の値を取得するか、管理者に依頼してください。

必要な環境変数：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=chumo-3506a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=chumo-3506a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=chumo-3506a.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FUNCTIONS_URL=https://asia-northeast1-chumo-3506a.cloudfunctions.net
```

#### 3. Firebase CLIの設定（初回のみ）

```bash
# Firebase CLIがインストールされていない場合
npm install -g firebase-tools

# Firebaseにログイン（初回のみ）
firebase login

# プロジェクトを選択（初回のみ）
firebase use --add
# プロンプトでプロジェクトID「chumo-3506a」を選択
```

#### 4. 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## 推奨ツール

### MCPツールの導入（推奨）

開発効率を向上させるため、以下のMCPツールの導入を推奨します：

#### Serena MCP

コードの読み取り・編集を効率化するためのMCPツールです。

**導入方法**:
- Cursorを使用している場合: プロジェクトに既に設定済みです
- その他のエージェントを使用している場合: [Serena MCP](https://github.com/oraios/serena) のドキュメントを参照して導入してください

**主な機能**:
- シンボルベースのコード検索・編集
- 関数・クラス・メソッドの正確な修正
- コードのリファクタリング支援

#### Chrome DevTools MCP

ブラウザでの動作確認を効率化するためのMCPツールです。

**導入方法**:
- Cursorを使用している場合: プロジェクトに既に設定済みです
- その他のエージェントを使用している場合: [Chrome DevTools MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/chrome-devtools) のドキュメントを参照して導入してください

**主な機能**:
- ページのスナップショット取得
- コンソールエラーの確認
- ネットワークリクエストの確認
- UIの動作確認

## Code style

- **TypeScript**: strict mode有効
- **フォーマット**: `oxfmt`を使用
- **Lint**: `next lint`を使用
- **命名規則**:
  - コンポーネント: PascalCase
  - 関数・変数: camelCase
  - 定数: UPPER_SNAKE_CASE

### コードフォーマット

```bash
# フォーマット実行
npm run format

# フォーマットチェック
npm run format:check
```

### Lint

```bash
npm run lint
```

## 開発ルール

### MCPツールの使用ルール

#### Serena MCPの使用

**コード修正時の原則**: Serena MCPが有効な場合は、常にSerena MCPのツールを使用してコードを修正してください。

- **コードの読み取り**: `mcp_serena_read_file`、`mcp_serena_find_symbol`、`mcp_serena_get_symbols_overview`などを使用
- **コードの編集**: `mcp_serena_replace_symbol_body`、`mcp_serena_replace_regex`、`mcp_serena_insert_after_symbol`、`mcp_serena_insert_before_symbol`などを使用
- **シンボルの検索**: `mcp_serena_find_symbol`、`mcp_serena_find_referencing_symbols`を使用
- **パターン検索**: `mcp_serena_search_for_pattern`を使用

**使用すべき場面**:
- ファイルの読み取り・編集
- 関数・クラス・メソッドの修正
- シンボルの検索・参照の確認
- コードのリファクタリング
- バグ修正

**通常のツールとの使い分け**:
Serena MCPが利用できない場合や、以下のような場合のみ通常のツールを使用してください：
- ファイルの作成・削除（`write`、`delete_file`）
- ディレクトリの一覧取得（`list_dir`）
- ターミナルコマンドの実行（`run_terminal_cmd`）
- リンターエラーの確認（`read_lints`）

#### Chrome DevTools MCPの使用

**ローカルサーバーでの動作確認**: ローカルサーバーが起動している場合、またはローカルサーバーのURL（例: `http://localhost:3000`）が共有された場合は、Chrome DevTools MCPを使用してページを確認してください。

**使用すべき場面**:
- ページの表示確認
- UIの動作確認
- コンソールエラーの確認
- ネットワークリクエストの確認
- パフォーマンスの確認
- 要素の状態確認

**基本的なワークフロー**:
1. **ページに移動**: `mcp_chrome-devtools_navigate_page`でURLに移動
2. **スナップショット取得**: `mcp_chrome-devtools_take_snapshot`でページの状態を確認
3. **操作**: 必要に応じてクリック、入力などの操作を実行
4. **確認**: コンソールメッセージやネットワークリクエストを確認
5. **スクリーンショット**: 必要に応じて`mcp_chrome-devtools_take_screenshot`でスクリーンショットを取得

**確認すべき項目**:
- ページが正しく表示されているか
- エラーメッセージが表示されていないか
- コンソールにエラーが出ていないか（`mcp_chrome-devtools_list_console_messages`）
- ネットワークリクエストが正常に完了しているか（`mcp_chrome-devtools_list_network_requests`）
- UIの動作が期待通りか

**URLの検出**:
以下のような情報が提供された場合は、Chrome DevTools MCPを使用してください：
- `http://localhost:*` の形式のURL
- `localhost:3000` などのローカルサーバーのURL
- ユーザーが「ローカルサーバーが起動している」と明示的に述べた場合
- ユーザーが「ページを確認して」と依頼した場合

**優先順位**:
1. **Serena MCP**: コードの修正・読み取りは常に優先
2. **Chrome DevTools MCP**: ローカルサーバーでの動作確認が必要な場合
3. **通常のツール**: 上記のMCPツールが使用できない場合のみ

**注意事項**:
- Serena MCPとChrome DevTools MCPは併用可能です
- コード修正後は、Chrome DevTools MCPで動作確認を行うことを推奨します
- MCPツールが利用できない場合は、通常のツールを使用してください

### 実装テストのルール

**実装や修正を行った後は、必ず以下の手順で実装テストを行い、問題がないことを確認してから修正完了とします。**

#### 必須確認項目

1. **ブラウザでの動作確認**
   - ローカルサーバーが起動している場合、またはローカルサーバーのURL（例: `http://localhost:3000`）が共有された場合は、Chrome DevTools MCPを使用してページを確認してください
   - 実装した機能が正しく動作することを確認
   - UIが期待通りに表示されることを確認
   - ユーザーインタラクション（クリック、入力など）が正常に動作することを確認

2. **コンソールエラーの確認**
   - Chrome DevTools MCPの`mcp_chrome-devtools_list_console_messages`を使用して、コンソールにエラーが発生していないか確認
   - エラーメッセージが表示されている場合は、原因を特定して修正
   - 警告メッセージについても、必要に応じて対処

3. **ネットワークリクエストの確認**
   - 必要に応じて、`mcp_chrome-devtools_list_network_requests`を使用してAPIリクエストが正常に完了しているか確認
   - エラーレスポンスがないか確認

4. **ページスナップショットの確認**
   - `mcp_chrome-devtools_take_snapshot`を使用して、ページの状態が期待通りか確認
   - 要素が正しく表示されているか確認

#### 実装テストのワークフロー

1. **コード修正後**
   - コードの修正が完了したら、まずリンターエラーがないか確認（`read_lints`）

2. **ブラウザでの確認**
   - ローカルサーバーが起動している場合、またはURLが共有された場合：
     - `mcp_chrome-devtools_navigate_page`でページに移動（またはリロード）
     - `mcp_chrome-devtools_wait_for`で必要な要素が読み込まれるまで待機
     - `mcp_chrome-devtools_take_snapshot`でページの状態を確認
     - 実装した機能を実際に操作して動作確認
     - `mcp_chrome-devtools_list_console_messages`でエラーを確認

3. **問題の修正**
   - エラーや問題が見つかった場合、原因を特定して修正
   - 修正後、再度ブラウザで確認を繰り返す

4. **修正完了の判断**
   - すべての必須確認項目をクリアした場合のみ、修正完了とする
   - エラーが残っている場合は、修正完了としない

#### 注意事項

- ローカルサーバーが起動していない場合やURLが共有されていない場合は、実装テストをスキップしても構いません
- ただし、可能な限り実装テストを行うことを推奨します
- 実装テストで問題が見つかった場合は、必ず修正してから完了とします

## Testing instructions

現在、テストスイートは実装されていません。機能追加時は、適切なテストを追加してください。

## Build commands

```bash
# フロントエンドビルド
npm run build

# Cloud Functionsビルド
npm run functions:build
```

## Deploy commands

```bash
# Firestoreルールとインデックスをデプロイ
firebase deploy --only firestore:rules,firestore:indexes

# Cloud Functionsをデプロイ
npm run functions:deploy

# 個別にデプロイ
npm run functions:deploy:timer
npm run functions:deploy:drive
npm run functions:deploy:github
```

## 重要な注意事項

### 手動で実行する必要がある手順

以下の手順は、エージェントが自動で実行できません。ユーザーに指示を出してください：

1. **環境変数設定**: `.env.local`ファイルの作成と設定値の入力（既存の開発者から取得）

### トラブルシューティング

- **Firebase CLIエラー**: `firebase login`を再実行
- **デプロイエラー**: `firebase use --add`でプロジェクトを再選択
- **環境変数エラー**: `.env.local`ファイルが正しく設定されているか確認

詳細なトラブルシューティングは `docs/operations/TROUBLESHOOTING.md` を参照してください。

## 参考ドキュメント

- `docs/setup/INITIAL_SETUP.md`: 初期セットアップ手順（詳細）
- `docs/setup/FIREBASE.md`: Firebase設定手順
- `docs/setup/ENV.md`: 環境変数設定手順
- `docs/setup/CHECKLIST.md`: Firebase初期設定チェックリスト
- `docs/operations/TROUBLESHOOTING.md`: トラブルシューティング

