# Cloud FunctionsにSecretsアクセス権限を付与する方法

## 概要

Cloud FunctionsがSecret ManagerからSecretsを読み取れるように、Cloud Functionsのサービスアカウントに権限を付与する必要があります。

---

## 方法1: GCP Console（Web UI）から付与（推奨：初心者向け）

### この方法がおすすめです！

**理由**: gcloud CLIがインストールされていなくても、ブラウザだけで完結できます。

### 手順（詳細）

#### ステップ1: PROJECT_NUMBERを確認

プロジェクト番号を確認する方法は複数あります。どれか1つで確認できればOKです。

**方法A: プロジェクト選択画面から確認（最も簡単）**

1. **GCP Consoleにアクセス**
   - [GCP Console](https://console.cloud.google.com/) にアクセス

2. **プロジェクト選択画面を開く**
   - 画面上部のプロジェクト名（`chumo-3506a`）をクリック
   - または、画面上部の「プロジェクトを選択」をクリック

3. **プロジェクト番号を確認**
   - プロジェクト一覧が表示されます
   - `chumo-3506a` の行に「**プロジェクト番号**」が表示されています
   - 例: `プロジェクト番号: 687214998081`
   - この番号をコピーしてメモしておいてください

**方法B: IAMと管理から確認**

1. **GCP Consoleにアクセス**
   - [GCP Console](https://console.cloud.google.com/) にアクセス
   - プロジェクト `chumo-3506a` を選択

2. **設定を開く**
   - 左メニューから「**IAMと管理**」→「**設定**」をクリック
   - または、検索バーで「設定」と検索

3. **プロジェクト番号を確認**
   - 「**プロジェクト番号**」が表示されています
   - 例: `687214998081`
   - この番号をコピーしてメモしておいてください

**方法C: ダッシュボードから確認**

1. **GCP Consoleにアクセス**
   - [GCP Console](https://console.cloud.google.com/) にアクセス
   - プロジェクト `chumo-3506a` を選択

2. **ダッシュボードを開く**
   - 左メニューから「**ホーム**」または「**ダッシュボード**」をクリック

3. **プロジェクト情報を確認**
   - 画面右上の「**プロジェクト情報**」セクションにプロジェクト番号が表示されています
   - 例: `プロジェクト番号: 687214998081`

**方法D: URLから確認（上級者向け）**

GCP ConsoleのURLにプロジェクト番号が含まれている場合があります：
- URL例: `https://console.cloud.google.com/home/dashboard?project=chumo-3506a`
- この場合、プロジェクト番号はURLからは直接確認できません

**どの方法でも確認できない場合**

プロジェクト番号がわからない場合でも、Secret Managerの権限付与は可能です。その場合は、以下の手順でサービスアカウントを検索してください：

1. Secret Manager → Secretを選択 → 「権限」タブ → 「アクセス権を付与」
2. 「新しいプリンシパル」の入力欄に `compute@developer.gserviceaccount.com` と入力
3. 候補が表示されるので、プロジェクト番号を含むものを選択
4. または、`*compute@developer.gserviceaccount.com` で検索

#### ステップ2: サービスアカウントのメールアドレスを作成

プロジェクト番号が `687214998081` の場合、サービスアカウントのメールアドレスは：
```
687214998081-compute@developer.gserviceaccount.com
```

**形式**: `PROJECT_NUMBER-compute@developer.gserviceaccount.com`

#### ステップ3: 各Secretに権限を付与

以下の5つのSecretに対して、同じ手順を繰り返します：

1. **Secret Managerに移動**
   - 左メニューから「**Secret Manager**」を選択
   - または、検索バーで「Secret Manager」と検索

2. **Secretを選択**
   - Secret一覧から、付与したいSecret名をクリック
   - 例: `DRIVE_PARENT_ID` をクリック

3. **権限タブを開く**
   - Secretの詳細ページで「**権限**」タブをクリック

4. **アクセス権を付与**
   - 「**アクセス権を付与**」ボタン（または「**追加**」ボタン）をクリック

5. **情報を入力**
   - **新しいプリンシパル**: 
     - `PROJECT_NUMBER-compute@developer.gserviceaccount.com` を入力
     - 例: `687214998081-compute@developer.gserviceaccount.com`
     - ⚠️ **重要**: このメールアドレスは**自動的に作成されるサービスアカウント**です。IAMで手動で登録する必要はありません。GCPが自動的に作成します。
     - ⚠️ **エラーが出る場合**: サービスアカウントがまだ存在しない可能性があります。下記の「エラー対処法」を参照してください。
   - **ロールを選択**: 
     - 「**Secret Manager シークレット アクセサー**」を選択
     - 検索バーで「secretAccessor」と検索すると見つかります
     - ⚠️ **重要**: 「オーナー」ではなく「Secret Manager シークレット アクセサー」を選択してください

### プリンシパル（Principal）とは？

**プリンシパル**は、GCPのIAM（Identity and Access Management）で**権限を付与する対象**のことです。

**プリンシパルの種類**:
- **ユーザーアカウント**: 個人のGoogleアカウント（例: `user@example.com`）
- **サービスアカウント**: アプリケーションやサービスが使用するアカウント（例: `687214998081-compute@developer.gserviceaccount.com`）
- **グループ**: 複数のユーザーをまとめたグループ

**この場合のプリンシパル**:
- `687214998081-compute@developer.gserviceaccount.com` は、**Cloud Functionsが自動的に使用するサービスアカウント**です
- このサービスアカウントは、Cloud Functionsを有効にすると**自動的に作成**されます
- **IAMで手動で登録する必要はありません**

### IAMで登録したメールアドレスについて

**質問**: IAMで登録したメールアドレスが正しい？

**答え**: 
- Cloud Functionsのサービスアカウント（`PROJECT_NUMBER-compute@developer.gserviceaccount.com`）は**自動的に作成される**ため、IAMで手動で登録する必要はありません
- ただし、Secret Managerの権限付与画面で、このサービスアカウントを検索できるようにする必要があります
- もし検索で見つからない場合は、メールアドレスを直接入力してください

6. **保存**
   - 「**保存**」ボタンをクリック
   - 成功メッセージが表示されます

7. **確認**
   - 「権限」タブに、追加したサービスアカウントが表示されていることを確認

#### ステップ4: すべてのSecretに対して繰り返す

以下の5つのSecretに対して、ステップ3を繰り返してください：

- ✅ `DRIVE_PARENT_ID`
- ✅ `CHECKSHEET_TEMPLATE_ID`
- ✅ `GITHUB_TOKEN`
- ✅ `DRIVE_SERVICE_ACCOUNT_KEY`
- ✅ `MAKE_WEBHOOK_SECRET`（後回しにする場合はスキップ）

### 完了の確認

すべてのSecretの「権限」タブに、同じサービスアカウント（`PROJECT_NUMBER-compute@developer.gserviceaccount.com`）が「Secret Manager シークレット アクセサー」のロールで表示されていれば完了です。

---

## 方法2: gcloud CLIから付与（上級者向け）

### ⚠️ 注意: gcloud CLIが必要です

**gcloud CLIがインストールされていない場合**: 方法1（GCP Console）を使用してください。

### gcloud CLIのインストール

macOSの場合：
```bash
# Homebrewでインストール
brew install --cask google-cloud-sdk

# インストール後、初期化
gcloud init
```

### 手順

1. **gcloudにログイン**
```bash
gcloud auth login
```

2. **プロジェクトを選択**
```bash
gcloud config set project chumo-3506a
```

3. **PROJECT_NUMBERを取得**
```bash
PROJECT_NUMBER=$(gcloud projects describe chumo-3506a --format="value(projectNumber)")
echo $PROJECT_NUMBER
```

4. **サービスアカウント名を設定**
```bash
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo $SERVICE_ACCOUNT
```

5. **各Secretに権限を付与**

```bash
# DRIVE_PARENT_ID
gcloud secrets add-iam-policy-binding DRIVE_PARENT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=chumo-3506a

# CHECKSHEET_TEMPLATE_ID
gcloud secrets add-iam-policy-binding CHECKSHEET_TEMPLATE_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=chumo-3506a

# GITHUB_TOKEN
gcloud secrets add-iam-policy-binding GITHUB_TOKEN \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=chumo-3506a

# DRIVE_SERVICE_ACCOUNT_KEY
gcloud secrets add-iam-policy-binding DRIVE_SERVICE_ACCOUNT_KEY \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=chumo-3506a
```

### コマンドの意味

- `gcloud secrets add-iam-policy-binding`: Secretに権限を追加するコマンド
- `--member`: 権限を付与する対象（Cloud Functionsのサービスアカウント）
- `--role`: 付与する権限の種類（`secretAccessor` = 読み取り権限）
- `--project`: GCPプロジェクトID

### 一括実行スクリプト

すべてのSecretに一度に権限を付与する場合：

```bash
#!/bin/bash
PROJECT_NUMBER=$(gcloud projects describe chumo-3506a --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

SECRETS=(
  "DRIVE_PARENT_ID"
  "CHECKSHEET_TEMPLATE_ID"
  "GITHUB_TOKEN"
  "DRIVE_SERVICE_ACCOUNT_KEY"
)

for SECRET in "${SECRETS[@]}"; do
  echo "Adding permission for ${SECRET}..."
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=chumo-3506a
done

echo "Done!"
```

---

## 権限付与の確認

### GCP Consoleで確認
1. Secret Manager → 各Secretを開く
2. 「権限」タブを確認
3. Cloud Functionsのサービスアカウントが「Secret Manager シークレット アクセサー」のロールで表示されていることを確認

### CLIで確認
```bash
# 特定のSecretの権限を確認
gcloud secrets get-iam-policy SECRET_NAME --project=chumo-3506a
```

---

## よくあるエラーと対処法

### エラー: `メールアドレスとドメインは、有効な Google アカウント、Google Workspace アカウント、または Cloud Identity アカウントに関連付けられている必要があります。`

**原因**: Cloud Functionsのサービスアカウント（`PROJECT_NUMBER-compute@developer.gserviceaccount.com`）がまだ作成されていない可能性があります。

**対処法1: サービスアカウントを検索して選択する**

1. 「新しいプリンシパル」の入力欄をクリック
2. `compute` と入力して検索
3. 候補の中から `PROJECT_NUMBER-compute@developer.gserviceaccount.com` を選択
   - 例: `687214998081-compute@developer.gserviceaccount.com`
4. もし候補に表示されない場合は、対処法2を試してください

**対処法2: Compute Engine APIを有効化する（サービスアカウントを作成する）**

Cloud Functionsのサービスアカウントは、Compute Engine APIを有効にすると自動的に作成されます。

1. GCP Console → 「APIとサービス」→「ライブラリ」
2. 「Compute Engine API」を検索
3. 「有効にする」をクリック
4. 数分待ってから、再度Secret Managerの権限付与を試してください

**対処法3: Cloud Functionsを一度デプロイする**

Cloud Functionsをデプロイすると、サービスアカウントが自動的に作成されます。

1. `functions`ディレクトリで `npm install` と `npm run build` を実行
2. `firebase deploy --only functions` を実行（エラーが出ても問題ありません）
3. デプロイ後、再度Secret Managerの権限付与を試してください

**対処法4: サービスアカウントの存在を確認する**

1. GCP Console → 「IAMと管理」→「サービスアカウント」
2. サービスアカウント一覧で `PROJECT_NUMBER-compute@developer.gserviceaccount.com` が存在するか確認
3. 存在しない場合は、対処法2または3を実行してください

---

## 推奨：最初はGCP Consoleから

**初心者の方は、まずGCP Console（Web UI）から権限を付与することをおすすめします。**

理由：
- ✅ 視覚的にわかりやすい
- ✅ エラーメッセージが分かりやすい
- ✅ 権限の確認が簡単
- ✅ コマンドラインの知識が不要

慣れてきたら、CLIを使うと効率的です。

