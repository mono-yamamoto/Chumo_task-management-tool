---
title: '/review-and-fix'
description: '現在のブランチのPRレビューを確認し、未対応のレビューコメントを修正する。'
---

あなたはPRレビューを確認して対応するアシスタントです。以下のルールで、現在のブランチのPRレビューを確認し、未対応のレビューコメントを修正してください。

## 目的

- 現在のブランチのPRを自動的に見つける
- レビューコメントを確認し、未対応（resolveされていない）のコメントを特定
- レビュー内容に基づいて修正を実施

## 実行タイミング

- ユーザーが明示的に `/review-and-fix` コマンドを実行した時
- PRレビューに対応する必要がある時

## ワークフロー

### 1. 現在のブランチからPRを探す

```bash
# 現在のブランチ名を取得
CURRENT_BRANCH=$(git branch --show-current)

# 現在のブランチのPRを検索してPR番号を取得
PR_NUMBER=$(gh pr list --head "$CURRENT_BRANCH" --json number --jq -r '.[0].number')

# PRが見つからない場合
if [ -z "$PR_NUMBER" ] || [ "$PR_NUMBER" = "null" ]; then
  echo "⚠️ 現在のブランチ（$CURRENT_BRANCH）に対応するPRが見つかりませんでした。"
  echo "PRを作成してください: gh pr create"
  exit 1
fi

# 後続セクション用にPR_NUMBERをexport
export PR_NUMBER
echo "Found PR #$PR_NUMBER for branch $CURRENT_BRANCH"
```

### 2. レビューコメントを取得

```bash
# PR番号は既にセクション1で取得済み
# リポジトリ情報を取得
REPO_INFO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')

# 全てのレビューコメントを取得（resolveされていないもの）
gh api repos/$REPO_INFO/pulls/$PR_NUMBER/comments \
  --jq '[.[] | select(.in_reply_to_id == null) | {id: .id, author: .user.login, body: .body[0:800], path: .path, line: .line, createdAt: .created_at}]'

# レビュー（review）を取得 + REVIEW_IDを抽出
gh api repos/$REPO_INFO/pulls/$PR_NUMBER/reviews \
  --jq '.[] | {id: .id, state: .state, author: .user.login, body: .body[0:500], submitted_at: .submitted_at}' | \
  while IFS= read -r review; do
    REVIEW_ID=$(echo "$review" | jq -r '.id')
    echo "Review #$REVIEW_ID:"
    echo "$review"

    # 各レビューに含まれるコメント取得
    gh api repos/$REPO_INFO/pulls/$PR_NUMBER/reviews/$REVIEW_ID/comments \
      --jq '.[] | {id: .id, path: .path, line: .line, body: .body[0:800]}'
  done
```

### 3. 未対応のレビューコメントを特定

**対応すべきコメント:**

- トップレベルのコメント（返信でないもの）
- 返信があるが、追加の修正が必要と明示されているコメント
- 解決状態の確認はGraphQL APIまたはWeb UIで手動確認

**対応しないコメント:**

- **返信で「意図的」「対応不要」というニュアンスが含まれているコメント**
  - 例：「これは意図的です」「対応不要です」「現状のままで問題ありません」など
  - 返信の内容を確認し、意図的に未対応であることが明示されている場合はスキップ

```bash
# トップレベルコメントを取得（返信でないもの）
gh api repos/$REPO_INFO/pulls/$PR_NUMBER/comments \
  --jq '[.[] | select(.in_reply_to_id == null) | {id: .id, author: .user.login, body: .body, path: .path, line: .line, created_at: .created_at}]'

# 返信があるコメントの返信内容を確認（対応不要かどうか判断）
gh api repos/$REPO_INFO/pulls/$PR_NUMBER/comments \
  --jq '[.[] | select(.in_reply_to_id != null) | {reply_to: .in_reply_to_id, author: .user.login, body: .body[0:300]}]'

# 解決状態の確認にはGraphQL APIを使用（より詳細な情報）
gh api graphql -f query='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes {
          isResolved
          comments(first: 10) {
            nodes {
              author { login }
              body
              path
              line
              createdAt
            }
          }
        }
      }
    }
  }
}' -f owner="$OWNER" -f repo="$REPO" -F pr="$PR_NUMBER"
```

### 4. レビュー内容の分析と優先順位付け

各レビューコメントを以下の基準で優先順位付け：

1. **Critical（🔴）**: セキュリティ脆弱性、重大なバグ
2. **Major（🟠）**: パフォーマンス問題、設計上の問題
3. **Minor（🟡）**: コードスタイル、軽微な改善

### 5. 修正の実施

各レビューコメントについて：

1. **指摘内容を理解**
   - ファイルパスと行番号を確認
   - 指摘の意図を理解
   - **返信がある場合は返信内容を確認し、「意図的」「対応不要」のニュアンスがないか確認**

2. **修正方法を決定**
   - 返信で「意図的」「対応不要」と明示されている場合は**修正をスキップ**
   - 指摘に従って修正する
   - 意図的に修正しない場合は理由を明確化

3. **修正を実施**
   - ファイルを読み込む
   - 適切な修正を実施
   - リンターエラーを確認

4. **修正内容を記録**
   - 修正したファイルと内容を記録
   - スキップしたコメントとその理由を記録
   - 次のステップ（返信コメント）のために情報を保持

### 6. 修正後の確認

```bash
# リンターエラーを確認
npm run lint

# 型チェック（存在する場合）
npm run type-check

# 修正したファイルの差分を確認
git diff
```

### 7. 修正内容の要約

修正完了後、以下の情報をユーザーに提示：

- 対応したレビューコメントの数
- 修正したファイル一覧
- 各修正の概要
- 次のステップ（コミット、プッシュ、返信コメント）

## 修正パターン

### パターン1: セキュリティ脆弱性

**例**: stateパラメータに署名がない

**対応**:

- HMAC署名付きトークンの実装
- 署名検証と有効期限チェックの追加

### パターン2: エラーハンドリング

**例**: APIのエラーレスポンス構造とフロントの処理が不一致

**対応**:

- エラーレスポンスの構造を確認
- フロント側のエラーハンドリングを修正

### パターン3: バリデーション

**例**: サーバー側で必須チェックが不足

**対応**:

- サーバー側のバリデーションを追加
- フロント側と整合性を保つ

### パターン4: パフォーマンス

**例**: 頻繁なFirestore書き込み

**対応**:

- `onChange` を `onBlur` に変更
- デバウンス処理の追加

### パターン5: コードスタイル

**例**: コードブロックに言語指定がない

**対応**:

- 適切な言語識別子を追加
- マークダウンのベストプラクティスに従う

## 注意事項

1. **重複修正の回避**
   - 既に修正済みのコメントはスキップ
   - 返信があるコメントは内容を確認してから対応

2. **意図的な未対応**
   - 修正しない場合は、明確な理由を記録
   - ユーザーに確認を求める

3. **段階的な対応**
   - Critical → Major → Minor の順で対応
   - 一度に全て対応しようとせず、優先順位の高いものから

4. **テストの実施**
   - 修正後は必ずリンターエラーを確認
   - 可能であれば動作確認も実施

## 完了チェックリスト

- [ ] 現在のブランチからPRを特定
- [ ] レビューコメントを全て取得
- [ ] 未対応（resolveされていない）コメントを特定
- [ ] 優先順位に従って修正を実施
- [ ] リンターエラーを確認
- [ ] 修正内容を要約してユーザーに提示
- [ ] 次のステップ（コミット、プッシュ、返信コメント）を提案

## 出力例

```
✅ PR #8 のレビューを確認しました。

未対応のレビューコメント: 5件

🔴 Critical (1件):
- app/api/auth/google/route.ts: stateパラメータのセキュリティ脆弱性

🟠 Major (2件):
- app/api/auth/google/route.ts: リダイレクトURI構築ロジック
- app/(dashboard)/reports/page.tsx: エラー詳細表示

🟡 Minor (2件):
- app/(dashboard)/contact/page.tsx: エラーハンドリング
- app/api/contact/route.ts: バリデーション

修正を開始しますか？ (y/n)
```
