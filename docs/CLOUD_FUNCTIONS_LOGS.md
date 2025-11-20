# Cloud Functionsのログ確認手順

Cloud Functionsでエラーが発生した際に、ログを確認して原因を特定する方法を説明します。

## 前提知識

### Cloud Functionsとは？
- Firebase/Google Cloud上で実行されるサーバーレス関数
- このプロジェクトでは、Driveフォルダ作成、GitHub Issue作成、タイマー機能などがCloud Functionsとして実装されています
- 各関数は独立したURLを持ち、HTTPリクエストで呼び出せます

### ログとは？
- Cloud Functionsが実行された際の動作記録
- エラーが発生した場合、その詳細な情報がログに記録されます
- ログを確認することで、何が原因でエラーが発生したかを特定できます

## 方法1: GCP Console（Webブラウザ）で確認する

### ステップ1: GCP Consoleにアクセス
1. ブラウザで [GCP Console](https://console.cloud.google.com/) を開く
2. プロジェクト `chumo-3506a` が選択されていることを確認
   - 画面上部のプロジェクト選択ドロップダウンで確認・変更可能

### ステップ2: Cloud Functionsのページに移動
1. 左側のメニューから「**Cloud Functions**」を選択
   - 見つからない場合は、検索バーで「Cloud Functions」と検索
2. 関数一覧が表示されます
   - `createDriveFolder` などの関数が表示されているはずです

### ステップ3: ログを確認
1. 確認したい関数（例: `createDriveFolder`）をクリック
2. 関数の詳細ページが開きます
3. 上部のタブから「**ログ**」を選択
4. ログ一覧が表示されます

### ステップ4: ログをフィルタリング
- **時間範囲**: 右上の時間範囲を選択（例: 「過去1時間」「過去24時間」）
- **ログレベル**: 
  - 「すべて」: すべてのログ
  - 「エラー」: エラーのみ
  - 「警告」: 警告のみ
- **検索**: 検索バーにキーワードを入力（例: 「チェックシート」）

### ステップ5: エラーログの確認
- エラーログは赤色で表示されます
- ログをクリックすると詳細が表示されます
- 以下の情報を確認：
  - **エラーメッセージ**: 何が問題だったか
  - **スタックトレース**: エラーが発生した場所
  - **リクエスト情報**: どのようなリクエストでエラーが発生したか

## 方法2: gcloud CLI（コマンドライン）で確認する

### ステップ1: gcloud CLIがインストールされているか確認
```bash
gcloud --version
```
- インストールされていない場合は、[gcloud CLIのインストール手順](https://cloud.google.com/sdk/docs/install)を参照

### ステップ2: プロジェクトを設定
```bash
gcloud config set project chumo-3506a
```

### ステップ3: ログを確認
```bash
# すべてのCloud Functionsのログを確認（最新50件）
gcloud functions logs read --limit=50

# 特定の関数のログを確認
gcloud functions logs read createDriveFolder --limit=50

# エラーのみを確認
gcloud functions logs read createDriveFolder --severity=ERROR --limit=50

# 過去1時間のログを確認
gcloud functions logs read createDriveFolder --since=1h

# リアルタイムでログを監視（Ctrl+Cで終了）
gcloud functions logs tail createDriveFolder
```

### ステップ4: ログの出力形式を変更
```bash
# JSON形式で出力（詳細情報を含む）
gcloud functions logs read createDriveFolder --format=json --limit=10

# 特定のフィールドのみを表示
gcloud functions logs read createDriveFolder --format="table(timestamp,severity,textPayload)" --limit=10
```

## チェックシート作成エラーの確認例

### エラーが発生した場合の確認手順

1. **Driveフォルダ作成を実行**
   - ブラウザでタスクの「Drive作成」ボタンをクリック
   - エラーメッセージが表示される場合、その内容をメモ

2. **ログを確認**
   - GCP Consoleまたはgcloud CLIでログを確認
   - 以下のキーワードで検索：
     - 「チェックシートの作成に失敗しました」
     - 「Google API Error」
     - 「checksheetTemplateId」

3. **エラーの詳細を確認**
   - エラーメッセージを確認
   - スタックトレースを確認
   - Google APIエラーの場合は、ステータスコードとレスポンスデータを確認

### よくあるエラーの原因と対処法

#### 1. 権限エラー（403 Forbidden）
```
エラー: Permission denied
```
**原因**: サービスアカウントにDrive APIまたはSheets APIの権限がない
**対処法**: 
- GCP Consoleでサービスアカウントの権限を確認
- Drive APIとSheets APIが有効になっているか確認

#### 2. ファイルが見つからない（404 Not Found）
```
エラー: File not found
```
**原因**: チェックシートテンプレートIDが間違っている、またはファイルが削除された
**対処法**:
- Secret Managerの`CHECKSHEET_TEMPLATE_ID`が正しいか確認
- テンプレートファイルが存在するか確認

#### 3. 認証エラー（401 Unauthorized）
```
エラー: Invalid credentials
```
**原因**: サービスアカウントキーが無効または期限切れ
**対処法**:
- Secret Managerの`DRIVE_SERVICE_ACCOUNT_KEY`を再設定
- サービスアカウントキーを再生成

#### 4. Driveストレージ容量不足（403 Forbidden）
```
エラー: The user's Drive storage quota has been exceeded.
```
**原因**: Google Driveのストレージ容量が上限に達している
**対処法**:
- Google Driveのストレージ使用状況を確認
- 不要なファイルを削除して容量を確保
- Google Workspaceのストレージプランをアップグレード（必要に応じて）
- サービスアカウントが使用しているGoogleアカウントのストレージを確認

## ログの見方（詳細解説）

### ログの構造
```
2024-01-01 12:00:00.000 [INFO] チェックシートの作成に失敗しました: {
  error: "Permission denied",
  stack: "Error: Permission denied\n    at ...",
  checksheetTemplateId: "1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M",
  folderId: "abc123",
  taskTitle: "タスク名"
}
```

- **タイムスタンプ**: エラーが発生した時刻
- **ログレベル**: INFO, WARNING, ERRORなど
- **メッセージ**: エラーの内容
- **スタックトレース**: エラーが発生したコードの場所

### Google APIエラーの場合
```
Google API Error: {
  status: 403,
  statusText: "Forbidden",
  data: {
    error: {
      code: 403,
      message: "The caller does not have permission",
      status: "PERMISSION_DENIED"
    }
  }
}
```

- **status**: HTTPステータスコード（403=権限なし、404=見つからない、500=サーバーエラー）
- **message**: エラーの詳細メッセージ

## トラブルシューティング

### ログが表示されない場合
1. プロジェクトが正しく選択されているか確認
2. Cloud Functionsが実際に実行されたか確認（リクエストが送信されたか）
3. 時間範囲を広げて確認（過去24時間など）

### ログが多すぎる場合
1. ログレベルでフィルタリング（ERRORのみなど）
2. 検索キーワードで絞り込む
3. 時間範囲を狭める

### エラーの原因がわからない場合
1. エラーメッセージ全体をコピー
2. スタックトレースを確認
3. Google APIエラーの場合は、ステータスコードとメッセージを確認
4. 必要に応じて、エラーメッセージを検索エンジンで検索

## よくあるエラーの詳細対処法

### Driveストレージ容量不足エラー
「The user's Drive storage quota has been exceeded.」というエラーが表示された場合、詳細な対処法は `docs/DRIVE_STORAGE_QUOTA_ERROR.md` を参照してください。

## 参考リンク

- [GCP Console - Cloud Functions](https://console.cloud.google.com/functions)
- [gcloud functions logs コマンドのドキュメント](https://cloud.google.com/sdk/gcloud/reference/functions/logs)
- [Cloud Functions のログとモニタリング](https://cloud.google.com/functions/docs/monitoring/logging)
- [Cloud Run（Firebase Functions v2はCloud Run上で実行されます）](https://cloud.google.com/run)

