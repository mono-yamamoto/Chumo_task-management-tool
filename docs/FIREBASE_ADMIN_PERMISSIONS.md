# Firebase Admin SDKの権限設定

## 問題

Next.jsのAPIルートでFirebase Admin SDKを使用する際、`PERMISSION_DENIED`エラーが発生する場合があります。

## 原因

使用しているサービスアカウントにFirestoreへのアクセス権限がないためです。

## 解決方法

### 方法1: サービスアカウントにFirestoreへの権限を付与（推奨）

1. [GCP Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト `chumo-3506a` を選択
3. 「IAMと管理」→「IAM」を開く
4. 使用しているサービスアカウント（`FIREBASE_CLIENT_EMAIL`の値）を検索
5. サービスアカウントをクリックして「権限を編集」をクリック
6. 「ロールを追加」をクリック
7. 以下のロールを追加：
   - **Firebase Admin SDK Administrator Service Agent**（推奨）
   - または **Cloud Datastore User**
8. 「保存」をクリック

### 方法2: プロジェクトのデフォルトサービスアカウントを使用

Cloud Functionsと同じサービスアカウントを使用する場合：

1. GCP Console → 「IAMと管理」→「IAM」
2. プロジェクトのデフォルトサービスアカウントを確認
   - 形式: `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`
3. そのサービスアカウントのキーをダウンロード
4. `.env.local`に設定

### 方法3: 新しいサービスアカウントを作成して権限を付与

1. GCP Console → 「IAMと管理」→「サービスアカウント」
2. 「サービスアカウントを作成」をクリック
3. サービスアカウント名: `firebase-admin-api`
4. 「作成して続行」をクリック
5. ロールを追加：
   - **Firebase Admin SDK Administrator Service Agent**
6. 「完了」をクリック
7. 作成したサービスアカウントをクリック
8. 「キー」タブ → 「キーを追加」→ 「新しいキーを作成」
9. キーのタイプ: JSON
10. 「作成」をクリック（JSONファイルがダウンロードされる）
11. JSONファイルから`client_email`と`private_key`を取得して`.env.local`に設定

## 確認方法

権限が正しく設定されているか確認：

```bash
# サービスアカウントの権限を確認
gcloud projects get-iam-policy chumo-3506a \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:YOUR_SERVICE_ACCOUNT_EMAIL"
```

## 参考

- [Firebase Admin SDK の権限](https://firebase.google.com/docs/admin/setup#initialize-sdk)
- [Cloud IAM ロール](https://cloud.google.com/iam/docs/understanding-roles)

