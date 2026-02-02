# Firebase認証エラー対処法: auth/unauthorized-domain

## 問題

`auth/unauthorized-domain` エラーは、現在のドメインがFirebase認証の許可リストに含まれていない場合に発生します。

## 解決方法

### Step 1: Firebase Consoleで認証設定を開く

1. [Firebase Console](https://console.firebase.google.com/project/chumo-3506a/authentication/providers) にアクセス
2. 左メニューから「Authentication」をクリック
3. 「Sign-in method」タブを開く
4. 「Google」プロバイダーをクリック

### Step 2: 承認済みドメインを追加

1. 「承認済みドメイン」セクションを確認
2. 「ドメインを追加」をクリック
3. 以下のドメインを追加：
   - `192.168.11.6` （ローカル開発用）
   - `localhost` （念のため）
4. 「追加」をクリック

### Step 3: 確認

追加後、再度ログインボタンを押して動作を確認してください。

## 注意

- 本番環境では、実際のドメイン（例: `yourdomain.com`）も追加する必要があります
- ローカル開発では `localhost` とローカルIPアドレス（`192.168.11.6`）の両方を追加することを推奨します
