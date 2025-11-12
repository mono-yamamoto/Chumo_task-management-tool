# 許可リスト（ユーザー）の登録方法

## 方法1: Firebase Consoleから直接追加（推奨・簡単）

### Step 1: Firestoreにアクセス
1. [Firebase Console](https://console.firebase.google.com/project/chumo-3506a/firestore) にアクセス
2. 「Firestore Database」をクリック
3. 「データ」タブを開く

### Step 2: usersコレクションを作成
1. 「コレクションを開始」をクリック
2. コレクションID: `users` を入力
3. 「次へ」をクリック

### Step 3: 最初のドキュメントを作成
1. ドキュメントID: **GoogleアカウントのUID** を入力
   - UIDの確認方法: ログインを試みた後、ブラウザのコンソールでエラーメッセージを確認
   - または、Firebase Console → Authentication → Users で確認
2. フィールドを追加：
   - `email` (文字列): ユーザーのメールアドレス
   - `displayName` (文字列): 表示名
   - `role` (文字列): `admin` または `member`
   - `isAllowed` (ブール値): `true`
   - `createdAt` (タイムスタンプ): 現在の日時
   - `updatedAt` (タイムスタンプ): 現在の日時
3. 「保存」をクリック

### Step 4: 確認
ログインページに戻って、再度ログインを試してください。

---

## 方法2: スクリプトを使用（複数ユーザーを一括登録）

`scripts/create-user.ts` スクリプトを作成して実行する方法です。

### Step 1: GoogleアカウントのUIDを確認
1. Firebase Console → Authentication → Users
2. ユーザーのUIDをコピー

### Step 2: スクリプトを実行
```bash
# スクリプトを実行（UIDとメールアドレスを指定）
npm run create-user -- --uid YOUR_UID --email user@example.com --displayName "ユーザー名" --role admin
```

---

## 方法3: 管理者設定画面から追加（ログイン後）

ログイン後、管理者権限があれば `/dashboard/settings` から許可リストを管理できます。

---

## 注意点

- **UIDの確認**: ログインを試みた後、Firebase Console → Authentication → Users でUIDを確認できます
- **最初の管理者**: 最初のユーザーは `role: "admin"` に設定することを推奨します
- **メールアドレス**: 完全一致でチェックされるため、正確に入力してください

