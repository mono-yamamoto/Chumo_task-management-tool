# Driveストレージ容量不足エラーの対処法

## エラーメッセージ

```
GaxiosError: The user's Drive storage quota has been exceeded.
```

## 原因

### 可能性1: ストレージ容量が不足している

サービスアカウントが使用しているGoogleアカウントのストレージ容量が上限に達しているため、新しいファイル（チェックシート）を作成できません。

**重要**: 手動でファイルを作成できるのに、Cloud Functionsから容量不足エラーが出る場合は、**サービスアカウントが使用しているGoogleアカウントと、手動で操作しているGoogleアカウントが異なる**可能性が高いです。

### 可能性2: 権限の問題（容量不足エラーとして表示される場合がある）

サービスアカウントが親フォルダ（`DRIVE_PARENT_ID`）に「編集者」権限を持っていない場合、ファイルを作成できず、容量不足エラーとして表示される場合があります。

**オーナーのドライブ容量が1TB空いているのに容量不足エラーが出る場合**: `docs/DRIVE_PERMISSION_CHECK.md` を参照して、サービスアカウントが親フォルダに「編集者」権限を持っているか確認してください。

## 対処法

### 1. ストレージ使用状況を確認

#### 方法A: Google Drive（Web）で確認

1. [Google Drive](https://drive.google.com/) にアクセス
2. 左下の「**ストレージ**」をクリック
3. 使用量と上限を確認

#### 方法B: Google Oneで確認

1. [Google One](https://one.google.com/) にアクセス
2. ストレージ使用状況を確認

### 2. ストレージを解放する

#### 不要なファイルを削除

- 古いファイルや不要なファイルを削除
- ゴミ箱を空にする（ゴミ箱のファイルも容量を消費します）

#### 大きなファイルを特定

1. Google Driveで「サイズ」でソート
2. 大きなファイルを確認して削除またはアーカイブ

#### 共有ファイルの確認

- 自分が所有していない共有ファイルは容量を消費しませんが、自分が所有しているファイルは容量を消費します

### 3. サービスアカウントが使用しているGoogleアカウントを確認（重要）

このプロジェクトでは、サービスアカウントを使用してDriveにアクセスしています。

**重要**: 手動でファイルを作成できるのにCloud Functionsから容量不足エラーが出る場合は、サービスアカウントが使用しているGoogleアカウントと、手動で操作しているGoogleアカウントが異なる可能性が高いです。

#### サービスアカウントキーに含まれるメールアドレスを確認

> **gcloud CLIがインストールされていない場合**: `docs/CHECK_SERVICE_ACCOUNT_EMAIL.md` を参照してください。

1. **Secret Managerからサービスアカウントキーを取得**

   **方法A: GCP Console（Web UI）で確認（推奨）**
   - [GCP Console](https://console.cloud.google.com/) → 「Secret Manager」→ `DRIVE_SERVICE_ACCOUNT_KEY` → 最新バージョン → 「シークレット値を表示」
   - 詳細な手順は `docs/CHECK_SERVICE_ACCOUNT_EMAIL.md` を参照

   **方法B: gcloud CLIで確認**

   ```bash
   gcloud secrets versions access latest --secret="DRIVE_SERVICE_ACCOUNT_KEY" --project=chumo-3506a
   ```

2. **JSONの中の`client_email`フィールドを確認**

   ```json
   {
     "type": "service_account",
     "project_id": "...",
     "private_key_id": "...",
     "private_key": "...",
     "client_email": "xxxxx@xxxxx.iam.gserviceaccount.com",  ← これがサービスアカウントのメールアドレス
     ...
   }
   ```

3. **そのメールアドレスに関連付けられているGoogleアカウントを特定**
   - サービスアカウントのメールアドレス（`@xxxxx.iam.gserviceaccount.com`）は、GCPプロジェクトに関連付けられています
   - 通常、プロジェクトのオーナーまたは作成者のGoogleアカウントが関連付けられています
   - **そのGoogleアカウントでGoogle Driveにログインしてストレージ使用状況を確認**
   - **このアカウントのストレージ容量が不足している可能性が高いです**

#### サービスアカウントのストレージ容量を確認する方法

サービスアカウント自体にはストレージ容量はありませんが、サービスアカウントキーを作成したGoogleアカウント（またはサービスアカウントに権限を付与したGoogleアカウント）のストレージ容量が問題です。

**重要**: オーナーアカウントのドライブ容量が1TB空いているのに容量不足エラーが出る場合は、**サービスアカウントが使用しているGoogleアカウントと、オーナーアカウントが異なる**可能性が高いです。

**確認手順**:

1. サービスアカウントキーの`client_email`を確認
2. プロジェクトのオーナーを確認（GCP Console → 「IAMと管理」→「IAM」）
3. サービスアカウントキーを作成したGoogleアカウントを特定
4. **そのGoogleアカウントでGoogle Driveにログインしてストレージ使用状況を確認**
5. 詳細な手順は `docs/DRIVE_SERVICE_ACCOUNT_STORAGE.md` を参照

### 4. ストレージプランをアップグレード（必要に応じて）

無料プラン（15GB）から有料プランにアップグレードすることで、容量を増やすことができます。

1. [Google One](https://one.google.com/) にアクセス
2. 「ストレージを追加」をクリック
3. プランを選択して購入

### 5. 一時的な回避策

ストレージ容量を確保できない場合の一時的な対処法：

#### チェックシート作成をスキップ

- 現在の実装では、チェックシート作成が失敗してもフォルダ作成は成功します
- フォルダは作成されるので、手動でチェックシートを追加することも可能です

#### 別のGoogleアカウントを使用

- 別のGoogleアカウントでサービスアカウントキーを作成
- そのアカウントのストレージ容量が十分な場合、そちらを使用

#### 個人アカウントのOAuth 2.0認証を使用する

- 技術的には可能ですが、実装が複雑になります
- 詳細は `docs/DRIVE_AUTH_ALTERNATIVES.md` を参照してください

## 確認手順

1. **エラーの確認**
   - Cloud Functionsのログでエラーメッセージを確認
   - 「The user's Drive storage quota has been exceeded.」が表示されているか確認

2. **サービスアカウントが使用しているGoogleアカウントを特定**

   **GCP Console（Web UI）で確認（推奨）**
   - [GCP Console](https://console.cloud.google.com/) → 「Secret Manager」→ `DRIVE_SERVICE_ACCOUNT_KEY` → 最新バージョン → 「シークレット値を表示」
   - JSONの中の`client_email`フィールドを確認
   - 詳細な手順は `docs/CHECK_SERVICE_ACCOUNT_EMAIL.md` を参照

   **gcloud CLIで確認（インストール済みの場合）**

   ```bash
   gcloud secrets versions access latest --secret="DRIVE_SERVICE_ACCOUNT_KEY" --project=chumo-3506a | jq -r '.client_email'
   ```

   - 出力されたメールアドレスを確認
   - このメールアドレスに関連付けられているGoogleアカウントを特定

3. **そのGoogleアカウントのストレージ使用状況を確認**
   - 特定したGoogleアカウントでGoogle Driveにログイン
   - ストレージ使用状況を確認
   - 上限に達しているか確認

4. **対処の実施**
   - そのGoogleアカウントの不要なファイルを削除
   - またはそのGoogleアカウントのストレージプランをアップグレード

5. **再試行**
   - ストレージ容量を確保した後、再度Driveフォルダ作成を試行

## よくある質問

### Q: 手動でファイルを作成できるのに、なぜCloud Functionsからは容量不足エラーが出るの？

A: サービスアカウントが使用しているGoogleアカウントと、手動で操作しているGoogleアカウントが異なるためです。

- **手動で操作しているアカウント**: あなたがログインしているGoogleアカウント（ストレージ容量に余裕がある）
- **サービスアカウントが使用しているアカウント**: Secret Managerの`DRIVE_SERVICE_ACCOUNT_KEY`に含まれる`client_email`に関連付けられているアカウント（ストレージ容量が不足している）

サービスアカウントキーに含まれる`client_email`を確認して、そのアカウントのストレージ容量を確認してください。

### Q: フォルダは作成できるのに、なぜチェックシート（ファイル）は作成できないの？

A: **フォルダとファイルでストレージ容量の扱いが異なるため**です。

- **フォルダ**: 容量を消費しない（メタデータのみ）
- **ファイル**: 容量を消費する

つまり、サービスアカウントが使用しているGoogleアカウントのストレージ容量が上限に達しているため：

- ✅ **フォルダは作成できる**（容量を消費しないため）
- ❌ **ファイル（チェックシート）は作成できない**（容量が必要なため）

これは権限の問題ではなく、**ストレージ容量の問題**です。サービスアカウントが使用しているGoogleアカウントのストレージ容量を確認して、不要なファイルを削除するか、ストレージプランをアップグレードしてください。

## 予防策

### 定期的なクリーンアップ

- 定期的に不要なファイルを削除
- 古いプロジェクトのファイルをアーカイブ

### ストレージ使用量の監視

- Google Oneでストレージ使用量を定期的に確認
- 上限に近づいたらアラートを設定（可能な場合）

### ファイルサイズの最適化

- 大きなファイルは圧縮する
- 不要な添付ファイルを削除

## 参考リンク

- [Google Drive ストレージの管理](https://support.google.com/drive/answer/2375123)
- [Google One ストレージプラン](https://one.google.com/about/plans)
- [GCP Console - サービスアカウント](https://console.cloud.google.com/iam-admin/serviceaccounts)
