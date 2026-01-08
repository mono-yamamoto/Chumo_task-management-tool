# Fix PR Review

PRの未解決レビューコメントを取得し、修正対応を支援するコマンドです。

## 使い方

```
/fix-pr-review [PR番号]
```

PR番号を省略すると、現在のブランチに関連するPRを自動検出します。

## 実行内容

Claude Codeの機能を活用した確実なレビューコメント確認手法：

1. **GraphQL + Claude分析**: GitHub APIで基本情報を取得し、Claudeが解析
2. **WebFetch補完確認**: GitHub Web UIから詳細なコメントを直接取得
3. **TodoWrite進捗管理**: 発見したコメントを整理して順次対応
4. **統合修正**: 全ての修正をまとめてコミット

## 推奨実行手法

### 1. 基本確認（GitHub CLI）
```bash
# 現在のブランチでPRを確認
gh pr view --json reviews,reviewDecision

# レビューの全体状況を確認
gh pr view --json reviews
```

### 2. 詳細確認（WebFetch + Claude分析）
```
WebFetch: https://github.com/[owner]/[repo]/pull/[PR番号]
prompt: "PRの未解決レビューコメントを特定してください。特に、「Changes requested」やアクション可能なコメントを全て抽出して、ファイル名、行番号、コメント内容をリストアップしてください。"
```

### 3. 完全確認（統合GraphQLスクリプト + Claude処理）

**専用スクリプト実行**:
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

結果はClaudeが解析して未解決コメントを特定します。

### 4. 未解決スレッド件数の確認方法（最短ルート）
未解決スレッドの件数を確実に出したい場合は、専用スクリプト実行後に以下を確認します。

```bash
# 未解決スレッド件数のみを確認
rg "Unresolved threads:" .claude/tmp/fix-pr-review/unresolved_threads.md
```

表示例:
```
**Unresolved threads: 13**
```

未解決スレッドの詳細は `.claude/tmp/fix-pr-review/unresolved_threads.md` にまとまっています。

## 確実な未解決コメント特定手順

1. **GraphQLクエリ実行**: まず標準のGraphQLクエリで基本情報を取得
2. **WebFetch確認**: GraphQLで取得できない詳細コメントを補完確認
3. **TodoWrite活用**: 発見したコメントを整理して進捗管理
4. **順次修正**: 各ファイルを個別に修正し、進捗を更新
5. **統合コミット**: 全修正を`.claude/commands/commit.md`形式でまとめてコミット

## 修正後のコミット作成

修正完了後は、`.claude/commands/commit.md`のフォーマットに従ってコミットを作成：

```bash
git commit -m "fix: resolve PR review comments

- [具体的な修正内容1]
- [具体的な修正内容2]
- [具体的な修正内容3]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 機能

- 🔍 現在のブランチから自動的にPRを検出
- 📊 レビューの統計情報を表示
- ⚠️ 未解決レビューの詳細をリスト表示
- 📍 ファイルパスと行番号を明示
- 💬 コメント本文とレビュアー情報を表示
- 🔗 GitHubへの直接リンクを提供
- 📝 修正が必要なファイルの一覧表示

## トラブルシューティング

### レビュー件数が少なく見える場合
- GraphQLの`first: 100`制限により、古いレビューが取得されない可能性
- WebFetchで補完確認を実行
- GitHub Web UIでActionable commentsの数を直接確認

### "解決済み"と表示されるが実際は未解決の場合
- ブラウザキャッシュの影響でGitHub APIの情報が古い可能性
- 数分待ってから再実行
- WebFetchで最新状態を確認

## 要件

- `gh` (GitHub CLI) がインストールされていること
- 適切なGitHubの認証が設定されていること
