# GCP Secret ManagerでSecretsを作成する方法

## 方法1: GCP Console（Web UI）から作成（推奨：初心者向け）

### 手順

1. **GCP Consoleにアクセス**
   - [GCP Console](https://console.cloud.google.com/) にアクセス
   - プロジェクト `chumo-3506a` を選択

2. **Secret Managerに移動**
   - 左メニューから「**Secret Manager**」を選択
   - または、検索バーで「Secret Manager」と検索

3. **Secretを作成**
   - 「**シークレットを作成**」ボタンをクリック
   - 以下の情報を入力：
     - **名前**: Secret名（例: `DRIVE_PARENT_ID`）
     - **シークレット値**: 値を入力または貼り付け
   - 「**作成**」をクリック

### 各Secretの作成例

#### `DRIVE_PARENT_ID`

- **名前**: `DRIVE_PARENT_ID`
- **シークレット値**: `14l_ggl_SBo8FxZFDOKnmN7atbmaG-Rdh`

#### `CHECKSHEET_TEMPLATE_ID`

- **名前**: `CHECKSHEET_TEMPLATE_ID`
- **シークレット値**: `1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M`

#### `MAKE_WEBHOOK_SECRET`

- **名前**: `MAKE_WEBHOOK_SECRET`
- **シークレット値**: 任意の文字列（例: `your-secret-key-12345`）

#### `GITHUB_TOKEN`

- **名前**: `GITHUB_TOKEN`
- **シークレット値**: GitHub Personal Access Token（例: `ghp_xxxxxxxxxxxxx`）

#### `DRIVE_SERVICE_ACCOUNT_KEY`

- **名前**: `DRIVE_SERVICE_ACCOUNT_KEY`
- **シークレット値**: サービスアカウントのJSONキーの内容全体を貼り付け
  ```json
  {
    "type": "service_account",
    "project_id": "...",
    "private_key_id": "...",
    "private_key": "...",
    ...
  }
  ```

---

## 方法2: gcloud CLIから作成（推奨：上級者向け）

### 前提条件

- `gcloud` CLIがインストールされていること
- `gcloud auth login` でログイン済みであること
- プロジェクトが選択されていること（`gcloud config set project chumo-3506a`）

### 基本的なコマンド

```bash
# テキスト値を直接指定
echo -n "値" | gcloud secrets create SECRET_NAME --data-file=- --project=chumo-3506a

# ファイルから読み込む
gcloud secrets create SECRET_NAME --data-file=/path/to/file --project=chumo-3506a
```

### 各Secretの作成コマンド

#### `DRIVE_PARENT_ID`

```bash
echo -n "14l_ggl_SBo8FxZFDOKnmN7atbmaG-Rdh" | gcloud secrets create DRIVE_PARENT_ID --data-file=- --project=chumo-3506a
```

#### `CHECKSHEET_TEMPLATE_ID`

```bash
echo -n "1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M" | gcloud secrets create CHECKSHEET_TEMPLATE_ID --data-file=- --project=chumo-3506a
```

#### `MAKE_WEBHOOK_SECRET`

```bash
echo -n "your-secret-key-12345" | gcloud secrets create MAKE_WEBHOOK_SECRET --data-file=- --project=chumo-3506a
```

#### `GITHUB_TOKEN`

```bash
echo -n "ghp_your_token_here" | gcloud secrets create GITHUB_TOKEN --data-file=- --project=chumo-3506a
```

#### `DRIVE_SERVICE_ACCOUNT_KEY`

```bash
# JSONファイルがある場合
cat /path/to/service-account-key.json | gcloud secrets create DRIVE_SERVICE_ACCOUNT_KEY --data-file=- --project=chumo-3506a

# または、JSONを直接貼り付ける場合（複数行）
gcloud secrets create DRIVE_SERVICE_ACCOUNT_KEY --data-file=- --project=chumo-3506a <<EOF
{
  "type": "service_account",
  "project_id": "...",
  ...
}
EOF
```

---

## 作成後の確認

### GCP Consoleで確認

1. Secret Managerページで、作成したSecretが一覧に表示されることを確認
2. Secret名をクリックして、詳細を確認

### CLIで確認

```bash
# すべてのSecretsを一覧表示
gcloud secrets list --project=chumo-3506a

# 特定のSecretの詳細を確認
gcloud secrets describe SECRET_NAME --project=chumo-3506a
```

---

## よくある質問

### Q: Secretの値は後から変更できますか？

A: はい、新しいバージョンとして追加できます。GCP Consoleで「新しいバージョンを追加」をクリックするか、CLIで `gcloud secrets versions add` を使用します。

### Q: Secretの値を確認できますか？

A: はい、GCP Consoleで「バージョンを表示」をクリックすると、値を確認できます。CLIでは `gcloud secrets versions access latest --secret=SECRET_NAME` で確認できます。

### Q: Secretを削除できますか？

A: はい、GCP Consoleで削除ボタンをクリックするか、CLIで `gcloud secrets delete SECRET_NAME` を使用します。ただし、削除する前にCloud Functionsから参照を外す必要があります。

---

## 推奨：最初はGCP Consoleから

**初心者の方は、まずGCP Console（Web UI）から作成することをおすすめします。**

理由：

- ✅ 視覚的にわかりやすい
- ✅ エラーメッセージが分かりやすい
- ✅ 値の確認が簡単
- ✅ コマンドラインの知識が不要

慣れてきたら、CLIを使うと効率的です。
