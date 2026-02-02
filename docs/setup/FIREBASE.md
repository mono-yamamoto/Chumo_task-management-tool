# Firebase設定手順ガイド

## 1. Firebase認証有効化（Googleプロバイダー）

### 1-1. Firebase Consoleにアクセス

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択（まだ作成していない場合は「プロジェクトを追加」から作成）

### 1-2. 認証を有効化

1. 左メニューから「Authentication」をクリック
2. 「始める」ボタンをクリック（初回のみ）
3. 「Sign-in method」タブをクリック
4. 「Google」プロバイダーをクリック
5. 「有効にする」トグルをONにする
6. 「プロジェクトのサポートメール」を選択（デフォルトのメールアドレスでOK）
7. 「保存」をクリック

### 1-3. OAuth同意画面の設定（初回のみ）

- Google Cloud ConsoleでOAuth同意画面の設定が必要な場合があります
- Firebase Consoleから自動的に設定される場合もありますが、エラーが出た場合は手動で設定が必要です

---

## 2. Firestoreデータベース作成（本番モード）

### 2-1. Firestoreを有効化

1. Firebase Consoleの左メニューから「Firestore Database」をクリック
2. 「データベースを作成」をクリック

### 2-2. セキュリティルールの選択

1. 「本番モードで開始」を選択（推奨）
   - 注意: 本番モードは初期状態で全ての読み書きが拒否されます
   - セキュリティルールを設定する必要があります（次のステップで設定）

### 2-3. ロケーションの選択

1. データベースのロケーションを選択
   - 日本からアクセスする場合は「asia-northeast1 (Tokyo)」を推奨
   - または「asia-northeast2 (Osaka)」
2. 「有効にする」をクリック

### 2-4. データベースの作成完了

- 数分かかる場合があります
- 完了するとFirestore Databaseの画面が表示されます

---

## 3. Firestoreセキュリティルール設定（firestore.rules）

### 3-1. ローカルファイルの確認

プロジェクトルートに`firestore.rules`ファイルが存在することを確認してください。

### 3-2. Firebase CLIでデプロイ

ターミナルで以下のコマンドを実行：

```bash
# Firebaseにログイン（初回のみ）
firebase login

# プロジェクトを選択
firebase use --add
# プロンプトでプロジェクトIDを選択

# セキュリティルールをデプロイ
firebase deploy --only firestore:rules
```

### 3-3. Firebase Consoleで確認

1. Firebase Console → Firestore Database → 「ルール」タブ
2. デプロイしたルールが表示されていることを確認

### 3-4. ルールのテスト（オプション）

Firebase Consoleの「ルール」タブで「シミュレーター」を使用してルールをテストできます

---

## 4. Firestoreインデックス作成（composite indexes）

### 4-1. ローカルファイルの確認

プロジェクトルートに`firestore.indexes.json`ファイルが存在することを確認してください。

### 4-2. Firebase CLIでデプロイ

ターミナルで以下のコマンドを実行：

```bash
# インデックスをデプロイ
firebase deploy --only firestore:indexes
```

### 4-3. Firebase Consoleで確認

1. Firebase Console → Firestore Database → 「インデックス」タブ
2. デプロイしたインデックスが「構築中」または「有効」と表示されることを確認
   - インデックスの構築には数分〜数時間かかる場合があります

### 4-4. エラーが出た場合

- クエリを実行すると、必要なインデックスが自動的に提案される場合があります
- Firebase Consoleの「インデックス」タブに「インデックスを作成」リンクが表示されます
- そのリンクをクリックすると自動的にインデックスが作成されます

---

## まとめ：一度にデプロイする場合

セキュリティルールとインデックスを一度にデプロイする場合：

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## トラブルシューティング

### Firebase CLIがインストールされていない場合

```bash
npm install -g firebase-tools
```

### プロジェクトが選択されていない場合

```bash
firebase use --add
# プロジェクトIDを選択
```

### デプロイ権限がない場合

- Firebase Consoleでプロジェクトの「設定」→「ユーザーと権限」から適切な権限が付与されているか確認してください
