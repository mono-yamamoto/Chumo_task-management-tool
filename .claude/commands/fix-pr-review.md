# Fix PR Review

PRの未解決レビューコメントを取得し、修正対応を支援するコマンドです。

## 使い方

```
/fix-pr-review [PR番号]
```

PR番号を省略すると、現在のブランチに関連するPRを自動検出します。

## 実行内容

専用スクリプトを使用した確実な未解決レビューコメント確認：

1. **専用スクリプト実行**: `.claude/scripts/fix-pr-review.sh`で正確な未解決スレッドを取得
2. **TodoWrite進捗管理**: 発見したコメントを整理して順次対応
3. **順次修正**: 各ファイルを個別に修正し、進捗を更新
4. **統合コミット**: 全ての修正をまとめてコミット

## 推奨実行手法

### 1. 専用スクリプトで未解決スレッド確認

```bash
# PR番号指定で実行
bash .claude/scripts/fix-pr-review.sh 37

# 現在ブランチのPRを自動検出して実行
bash .claude/scripts/fix-pr-review.sh
```

このスクリプトは以下を自動実行します：
- PR基本情報の取得（タイトル、URL、ReviewDecision）
- 全レビュー本文の取得（APPROVED/CHANGES_REQUESTED/COMMENTED）
- 未解決レビュースレッドの完全取得（ページング対応）
- 構造化されたMarkdownレポート生成（`.claude/tmp/fix-pr-review/summary.md`）

### 2. 未解決スレッド件数の確認

専用スクリプト実行後に以下で件数を確認：

```bash
# 未解決スレッド件数のみを確認
rg "Unresolved threads:" .claude/tmp/fix-pr-review/unresolved_threads.md
```

表示例:
```
**Unresolved threads: 13**
```

未解決スレッドの詳細は `.claude/tmp/fix-pr-review/unresolved_threads.md` にまとまっています。

### 3. 修正対応手順

1. **未解決コメント特定**: スクリプト実行結果を確認
2. **TodoWrite活用**: 発見したコメントを整理して進捗管理
3. **順次修正**: 各ファイルを個別に修正し、進捗を更新
4. **統合コミット**: 全修正を`.claude/commands/commit.md`形式でまとめてコミット

## 修正後のコミット作成

修正完了後は、**[コミットルール](./../rules/commit-rules.md)** に従ってコミットを作成してください。

## 機能

- 🔍 現在のブランチから自動的にPRを検出
- 📊 未解決レビュースレッドの正確な件数表示
- ⚠️ 未解決レビューの詳細をリスト表示
- 📍 ファイルパスと行番号を明示
- 💬 コメント本文とレビュアー情報を表示
- 🔗 GitHubへの直接リンクを提供
- 📝 修正が必要なファイルの一覧表示

## トラブルシューティング

### スクリプトが見つからない場合
- `.claude/scripts/fix-pr-review.sh`ファイルが存在することを確認
- 実行権限が付与されていることを確認（`chmod +x .claude/scripts/fix-pr-review.sh`）

### 未解決スレッドが0件と表示される場合
- 実際に全てのレビューコメントが解決済みの可能性
- GitHub Web UIで直接確認して比較
- 数分待ってから再実行（GitHub APIのキャッシュ更新待ち）

## 要件

- `gh` (GitHub CLI) がインストールされていること
- 適切なGitHubの認証が設定されていること
- `.claude/scripts/fix-pr-review.sh`スクリプトが利用可能であること