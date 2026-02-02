# GitHubトークンの再登録手順（期限切れ時）

## 概要

GitHub Personal Access Tokenには有効期限があります。期限が切れたら、新しいトークンを発行してGCP Secret Managerに再登録する必要があります。

---

## 期限切れの確認方法

### エラーメッセージで確認

Cloud FunctionsでGitHub APIを呼び出す際に、以下のようなエラーが発生した場合、トークンの期限切れの可能性があります：

- `401 Unauthorized`
- `Bad credentials`
- `Token expired`

### GitHubで確認

1. GitHubにログイン
2. ユーザーのSettings → Developer settings → Personal access tokens → Tokens (classic)
3. トークン一覧で「Expires」列を確認

---

## 再登録手順（詳細）

### ステップ1: 新しいトークンを発行

1. **GitHubにログイン**
   - [GitHub](https://github.com/) にアクセスしてログイン

2. **設定ページに移動**
   - 右上のプロフィールアイコンをクリック
   - 「**Settings**」をクリック

3. **Developer settingsを開く**
   - 左メニューの一番下にある「**Developer settings**」をクリック
   - または、直接 [https://github.com/settings/developers](https://github.com/settings/developers) にアクセス

4. **Personal access tokensを開く**
   - 左メニューから「**Personal access tokens**」→「**Tokens (classic)**」をクリック
   - または、直接 [https://github.com/settings/tokens](https://github.com/settings/tokens) にアクセス

5. **新しいトークンを生成**
   - 「**Generate new token**」→「**Generate new token (classic)**」をクリック
   - 認証が必要な場合は、パスワードまたは2要素認証を入力

6. **トークンの設定**
   - **Note**: `chumo-task-management` または `chumo-task-management-tool` など、わかりやすい名前を入力
   - **Expiration**:
     - 推奨: `90 days` または `Custom`（適切な期間を設定）
     - 注意: `No expiration` も選択可能だが、セキュリティ上推奨されない
   - **Select scopes**:
     - ✅ **`repo`** にチェック（これが必須）
       - これにより、リポジトリへの読み書きアクセスが可能になります
     - その他のスコープは不要（デフォルトのままでOK）

7. **トークンを生成**
   - ページの一番下にある「**Generate token**」ボタンをクリック
   - ⚠️ **重要**: 表示されたトークンを**すぐにコピー**してください
   - トークンは一度しか表示されません。ページを閉じると二度と確認できません
   - 形式: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`（`ghp_`で始まる文字列）

### ステップ2: 古いトークンを削除（オプション）

**注意**: 古いトークンを削除する前に、新しいトークンが正しく動作することを確認してください。

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 古いトークン（Noteが `chumo-task-management` など）を見つける
3. 右側の「**Delete**」ボタンをクリック
4. 確認ダイアログで「**I understand, delete this token**」をクリック

### ステップ3: GCP Secret Managerに新しいトークンを登録

#### 方法A: GCP Console（Web UI）から更新

1. **GCP Consoleにアクセス**
   - [GCP Console](https://console.cloud.google.com/) にアクセス
   - プロジェクト `chumo-3506a` を選択

2. **Secret Managerに移動**
   - 左メニューから「**Secret Manager**」を選択。なかったら検索バーで検索すれば出てくる

3. **`GITHUB_TOKEN`を開く**
   - Secret一覧から「**GITHUB_TOKEN**」をクリック

4. **新しいバージョンを追加**
   - 「**新しいバージョンを追加**」ボタンをクリック
   - 「**シークレット値**」に新しいGitHubトークンを貼り付け
   - 「**追加**」をクリック

5. **確認**
   - 新しいバージョンが作成されたことを確認
   - 最新バージョンが「latest」として設定されていることを確認

#### 方法B: gcloud CLIから更新

```bash
# 新しいトークンをSecret Managerに追加
echo -n "ghp_your_new_token_here" | gcloud secrets versions add GITHUB_TOKEN --data-file=- --project=chumo-3506a

# 確認
gcloud secrets versions list GITHUB_TOKEN --project=chumo-3506a
```

### ステップ4: 動作確認

1. **Cloud Functionsをテスト**
   - タスク管理ツールでGitHub Issue作成機能をテスト
   - エラーが発生しないことを確認

2. **ログを確認**
   - GCP Console → Cloud Functions → `createFireIssue` → 「ログ」タブ
   - エラーがないことを確認

---

## よくある質問

### Q: 古いトークンを削除しなくても大丈夫？

A: はい、大丈夫です。古いトークンは期限切れになると自動的に無効になります。ただし、セキュリティ上、不要になったトークンは削除することを推奨します。

### Q: トークンの有効期限はどのくらいが適切？

A: セキュリティと利便性のバランスを考慮して、**90日**が推奨されます。より頻繁に更新したい場合は30日、更新頻度を減らしたい場合は180日や1年も選択可能です。

### Q: トークンを忘れてしまった場合は？

A: トークンは一度しか表示されないため、忘れた場合は新しいトークンを発行する必要があります。古いトークンは削除して、新しいトークンに置き換えてください。

### Q: 複数のトークンを持っていても大丈夫？

A: はい、問題ありません。ただし、管理が複雑になるため、不要になったトークンは削除することをおすすめします。

### Q: トークンの期限が切れる前に通知は来る？

A: GitHubから自動通知は来ません。定期的に確認するか、カレンダーにリマインダーを設定することをおすすめします。

---

## 定期メンテナンスの推奨

### 推奨スケジュール

- **トークン発行時**: カレンダーに90日後のリマインダーを設定
- **毎月1回**: GitHubのトークン一覧を確認して、期限が近いトークンをチェック
- **期限切れ時**: このドキュメントに従って再登録

### リマインダーの設定例

````
タイトル: GitHubトークン再登録
日付: トークン発行日 + 90日
内容: GCP Secret ManagerのGITHUB_TOKENを更新する
```text

---

## トラブルシューティング

### エラー: `401 Unauthorized` が続く
- **原因**: 新しいトークンが正しく登録されていない、またはトークンが無効
- **対処**:
  1. GitHubでトークンが有効か確認
  2. GCP Secret Managerで最新バージョンが正しく設定されているか確認
  3. Cloud Functionsを再デプロイ（必要に応じて）

### エラー: `Bad credentials`
- **原因**: トークンの形式が間違っている、またはトークンが無効
- **対処**:
  1. トークンが `ghp_` で始まっているか確認
  2. トークンに余分なスペースや改行が含まれていないか確認
  3. 新しいトークンを再発行

### エラー: `Resource not accessible by integration`
- **原因**: トークンに必要なスコープ（`repo`）が付与されていない
- **対処**: 新しいトークンを発行する際に、必ず `repo` スコープにチェックを入れる

---

## まとめ

1. ✅ GitHubで新しいトークンを発行（`repo`スコープ必須）
2. ✅ トークンをコピー（一度しか表示されない）
3. ✅ GCP Secret Managerで `GITHUB_TOKEN` の新しいバージョンを追加
4. ✅ 動作確認
5. ✅ カレンダーに次の更新日のリマインダーを設定

この手順に従えば、スムーズにトークンを更新できます。

````
