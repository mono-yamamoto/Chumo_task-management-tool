---
name: create-pr
description: 最近のコミットとブランチ名に基づいて、GitHub CLIを使用してプルリクエストを自動作成します
tools: Read, Edit, Write, Grep, Bash
model: inherit
---

# プルリクエスト作成

最近のコミットとブランチ名に基づいて、GitHub CLI（`gh`）を使用してプルリクエストを自動作成します。

## 使用タイミング

- 機能実装が完了し、変更をコミットした後
- レビュー用のプルリクエストを作成する準備ができた時
- コミットから自動的にPRタイトルと説明を生成したい時

## 使用方法

1. すべての変更がコミットされていることを確認
2. 現在のブランチをリモートにプッシュ
3. このコマンドを実行してPRを作成

## 実行手順

以下の手順を順番に実行してください：

1. **GitHub CLIの確認**

   ```bash
   gh --version
   ```

   インストールされていない場合は、ユーザーにインストールを促す

2. **現在のブランチを取得**

   ```bash
   git branch --show-current
   ```

3. **ブランチがプッシュされているか確認**

   ```bash
   git push --dry-run 2>&1
   ```

   プッシュされていない場合は、プッシュする：

   ```bash
   git push -u origin $(git branch --show-current)
   ```

4. **main/masterに含まれていないコミットを取得**

   ```bash
   # まずmainを試し、なければmasterを試す
   git log origin/main..HEAD --oneline 2>/dev/null || git log origin/master..HEAD --oneline
   ```

5. **ブランチ名からIssue番号を抽出**
   - パターン: `issue-<番号>` または `feature-<番号>` または単に `<番号>`
   - 例: `issue-26` → `26`

6. **PRタイトルを生成**
   - コミットメッセージを分析
   - 最も重要なコミットを使用するか、要約を作成
   - 形式: `<絵文字> <type>(<scope>): <説明> (#<issue>)`
   - 複数の関連コミットがある場合は、1つのタイトルにまとめる

7. **PR説明を生成**
   - すべてのコミットをマークダウン形式でリスト化
   - 要約セクションを追加
   - Issue参照を含める: `Closes #<issue>` または `Related to #<issue>`

8. **PRを作成**

   ```bash
   gh pr create --title "<タイトル>" --body "<説明>"
   ```

9. **ブラウザでPRを開く**（オプション）
   ```bash
   gh pr view --web
   ```

## PRタイトル形式

コミットメッセージ規約に従う：

- `✨ feat(scope): 説明 (#issue)`
- `🐛 fix(scope): 説明 (#issue)`
- `♻️ refactor(scope): 説明 (#issue)`

## PR説明テンプレート

```markdown
## 概要

[変更の簡潔な要約]

## 変更内容

- [変更1]
- [変更2]

## 関連コミット

- ✨ feat(scope): 説明 (#issue)
- 🐛 fix(scope): 説明 (#issue)

## 関連Issue

Closes #<issue番号>
```

## 実行例

ブランチが `issue-26` で、コミットが以下の場合：

- `✨ feat(tasks): 未アサインの新規タスクを上位表示 (#26)`
- `✨ feat(ui): Badgeコンポーネントを追加 (#26)`

**PRタイトル:**

```
✨ feat(tasks): 未アサインの新規タスクを上位表示とNewラベル機能 (#26)
```

**PR説明:**

```markdown
## 概要

未アサインかつ作成から1週間以内のタスクを常に上位表示し、Newラベルを表示する機能を実装しました。

## 変更内容

- 未アサインかつ作成から1週間以内のタスクをソートで上位表示
- Newラベルをタイトル横に表示（汎用Badgeコンポーネント化）
- タスク一覧ページにソートロジックを追加

## 関連コミット

- ✨ feat(tasks): 未アサインの新規タスクを上位表示 (#26)
- ✨ feat(ui): Badgeコンポーネントを追加 (#26)

## 関連Issue

Closes #26
```

## 注意事項

- GitHub CLI（`gh`）がインストールされ、認証されている必要があります
- PRを作成する前にブランチをリモートにプッシュする必要があります
- Issue番号はブランチ名から抽出されます（例: `issue-26` → `26`）
- PR作成に失敗した場合は、エラーメッセージを表示し、手動作成を提案します
