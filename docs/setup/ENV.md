# Firebase設定値の取得方法と.env.localの作成

## Step 1: Firebase Consoleで設定値を取得

1. [Firebase Console](https://console.firebase.google.com/project/chumo-3506a/overview) にアクセス
2. 左上の⚙️（歯車）アイコン → 「プロジェクトの設定」をクリック
3. 「全般」タブを開く
4. 下にスクロールして「マイアプリ」セクションを確認

### Webアプリがまだ追加されていない場合：

1. 「アプリを追加」ボタンをクリック
2. 「</>」Webアイコンを選択
3. アプリのニックネームを入力（例: `chumo-task-management-web`）
4. 「Firebase Hosting も設定する」はチェックを外してOK
5. 「アプリを登録」をクリック

### 設定値のコピー：

登録後、以下のようなコードが表示されます：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "chumo-3506a.firebaseapp.com",
  projectId: "chumo-3506a",
  storageBucket: "chumo-3506a.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};
```

この値を`.env.local`に転記します。

---

## Step 2: .env.localファイルの作成

プロジェクトルートに`.env.local`ファイルを作成し、以下の形式で記述：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=ここにapiKeyの値を貼り付け
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ここにauthDomainの値を貼り付け
NEXT_PUBLIC_FIREBASE_PROJECT_ID=chumo-3506a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ここにstorageBucketの値を貼り付け
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=ここにmessagingSenderIdの値を貼り付け
NEXT_PUBLIC_FIREBASE_APP_ID=ここにappIdの値を貼り付け
NEXT_PUBLIC_FUNCTIONS_URL=https://asia-northeast1-chumo-3506a.cloudfunctions.net

# Firebase Admin SDK用（サーバーサイドで使用）
FIREBASE_PROJECT_ID=chumo-3506a
FIREBASE_CLIENT_EMAIL=ここにサービスアカウントのメールアドレスを貼り付け
FIREBASE_PRIVATE_KEY=ここにサービスアカウントの秘密鍵を貼り付け

# Google OAuth 2.0用
GOOGLE_OAUTH_CLIENT_ID=ここにOAuth 2.0クライアントIDを貼り付け
GOOGLE_OAUTH_CLIENT_SECRET=ここにOAuth 2.0クライアントシークレットを貼り付け
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# 本番環境（Vercel）では以下を設定:
# GOOGLE_OAUTH_REDIRECT_URI=https://chumo-task.vercel.app/api/auth/google/callback
```

**注意**: 
- `NEXT_PUBLIC_` プレフィックスは必須です（Next.jsでクライアント側で使用するため）
- 実際の値はFirebase Consoleから取得した値に置き換えてください
- `NEXT_PUBLIC_FUNCTIONS_URL`はCloud Functionsをデプロイした後に正しいURLに更新してください

---

## 例（実際の値に置き換えてください）

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=chumo-3506a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=chumo-3506a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=chumo-3506a.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
NEXT_PUBLIC_FUNCTIONS_URL=https://asia-northeast1-chumo-3506a.cloudfunctions.net
```
