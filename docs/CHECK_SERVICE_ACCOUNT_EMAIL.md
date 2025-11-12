# サービスアカウントのメールアドレスを確認する方法

## 方法1: GCP Console（Web UI）で確認する（推奨）

gcloud CLIがインストールされていない場合、GCP Consoleから直接確認できます。

### ステップ1: GCP Consoleにアクセス
1. ブラウザで [GCP Console](https://console.cloud.google.com/) を開く
2. プロジェクト `chumo-3506a` が選択されていることを確認
   - 画面上部のプロジェクト選択ドロップダウンで確認・変更可能

### ステップ2: Secret Managerに移動
1. 左側のメニューから「**Secret Manager**」を選択
   - 見つからない場合は、検索バーで「Secret Manager」と検索
2. Secret一覧が表示されます

### ステップ3: DRIVE_SERVICE_ACCOUNT_KEYを開く
1. `DRIVE_SERVICE_ACCOUNT_KEY` をクリック
2. Secretの詳細ページが開きます

### ステップ4: 最新バージョンを確認
1. 「バージョン」タブを選択
2. 最新のバージョン（通常は「latest」または最新の日付）をクリック

### ステップ5: シークレット値を表示
1. 「シークレット値を表示」ボタンをクリック
2. JSON形式のサービスアカウントキーが表示されます

### ステップ6: client_emailを確認
JSONの中から `client_email` フィールドを探します：

```json
{
  "type": "service_account",
  "project_id": "chumo-3506a",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "xxxxx@xxxxx.iam.gserviceaccount.com",  ← これがサービスアカウントのメールアドレス
  "client_id": "...",
  ...
}
```

この `client_email` の値が、サービスアカウントが使用しているメールアドレスです。

## 方法2: gcloud CLIで確認する（インストール済みの場合）

### gcloud CLIのインストール確認
```bash
gcloud --version
```

### インストールされていない場合
[gcloud CLIのインストール手順](https://cloud.google.com/sdk/docs/install)を参照してください。

### インストール済みの場合
```bash
# プロジェクトを設定
gcloud config set project chumo-3506a

# サービスアカウントキーを取得してclient_emailを表示
gcloud secrets versions access latest --secret="DRIVE_SERVICE_ACCOUNT_KEY" --project=chumo-3506a | jq -r '.client_email'
```

**注意**: `jq` がインストールされていない場合は、以下のコマンドでJSON全体を表示して、`client_email` を手動で探してください：

```bash
gcloud secrets versions access latest --secret="DRIVE_SERVICE_ACCOUNT_KEY" --project=chumo-3506a
```

## 次のステップ

`client_email` を確認したら：

1. **そのメールアドレスに関連付けられているGoogleアカウントを特定**
   - サービスアカウントのメールアドレス（`@xxxxx.iam.gserviceaccount.com`）は、GCPプロジェクトに関連付けられています
   - 通常、プロジェクトのオーナーまたは作成者のGoogleアカウントが関連付けられています

2. **そのGoogleアカウントでGoogle Driveにログイン**
   - そのアカウントで [Google Drive](https://drive.google.com/) にアクセス
   - ストレージ使用状況を確認

3. **ストレージ容量を確保**
   - 不要なファイルを削除
   - またはストレージプランをアップグレード

## トラブルシューティング

### Secret Managerにアクセスできない場合
- GCPプロジェクトにアクセス権限があるか確認
- プロジェクト `chumo-3506a` が正しく選択されているか確認

### client_emailが見つからない場合
- JSON形式が正しいか確認
- 最新のバージョンを確認しているか確認

### サービスアカウントのメールアドレスがわからない場合
- GCP Console → 「IAMと管理」→「サービスアカウント」でサービスアカウント一覧を確認
- Drive APIを使用しているサービスアカウントを探す

