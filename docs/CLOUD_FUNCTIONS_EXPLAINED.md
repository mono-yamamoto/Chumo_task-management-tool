# Cloud Functionsとは？

## 概要

Cloud Functions（クラウドファンクション）は、Google Cloud Platform（GCP）で提供される**サーバーレス関数実行サービス**です。コードを書いてデプロイするだけで、自動的にスケールし、HTTPリクエストやイベントに応じて実行されます。

## このプロジェクトでの役割

このタスク管理ツールでは、Cloud Functionsが以下の**バックエンド処理**を担当しています：

### 1. **タイマー機能** (`startTimer`, `stopTimer`)
- **何をしているか**: タスクの作業時間を計測するタイマーの開始・停止を管理
- **なぜ必要か**: 
  - フロントエンドから直接Firestoreに書き込むと、セキュリティルールが複雑になる
  - 排他制御（同時に複数のタイマーが動かないようにする）をサーバー側で実装
  - 時間の計算（1分単位への丸め）をサーバー側で行う

### 2. **Google Drive連携** (`createDriveFolder`)
- **何をしているか**: タスク用のGoogle Driveフォルダとチェックシートを作成
- **なぜ必要か**:
  - Google Drive APIの認証情報（サービスアカウントキー）をフロントエンドに公開できない
  - テンプレートからチェックシートを複製し、タスク情報を書き込む処理

### 3. **GitHub連携** (`createFireIssue`)
- **何をしているか**: タスクに対応するGitHub Issueを作成
- **なぜ必要か**:
  - GitHub APIの認証トークンをフロントエンドに公開できない
  - Issue作成時の複雑な処理（アサイン設定など）

### 4. **レポート機能** (`getTimeReport`, `exportTimeReportCSV`)
- **何をしているか**: 作業時間の集計とCSVエクスポート
- **なぜ必要か**:
  - 大量のデータを集計する処理はサーバー側で行う方が効率的
  - CSV生成処理

### 5. **Backlog連携** (`syncBacklog`)
- **何をしているか**: Backlogからタスクを同期（Make経由）
- **なぜ必要か**:
  - 外部APIとの連携処理
  - 冪等性の保証（重複実行を防ぐ）

### 6. **Google Chat連携** (`createGoogleChatThread`)
- **何をしているか**: タスク詳細ページやドロワーからGoogle Chatスペースにスレッド（メッセージ）を投稿し、そのURLをタスクに保存
- **なぜ必要か**:
  - プロジェクトの会話をChatで始める作業をボタン1つで完結させる
  - Webhook URLやスペースURLなどの機密値をフロントエンドに露出させずに済む
  - 既にスレッドがある場合は再利用し、重複投稿を防ぐ
- **セットアップ**:
  - Chatスペース（例: https://mail.google.com/mail/u/1/#chat/space/AAQApGRYb9c）でIncoming Webhookを作成し、Secret Managerに `GOOGLE_CHAT_WEBHOOK_URL` として保存
  - 同じスペースのベースURLを `GOOGLE_CHAT_SPACE_URL` としてSecret Managerに登録し、Cloud Functionが戻り値としてクリック可能なリンクを作れるようにする

## デプロイが必要なタイミング

### ✅ **必ずデプロイが必要な場合**

1. **Cloud Functionsのコードを変更した時**
   - `functions/src/` 配下のファイルを編集した場合
   - 例: タイマーのロジックを変更、エラーハンドリングを追加

2. **依存パッケージを追加・更新した時**
   - `functions/package.json` を変更した場合
   - 例: 新しいライブラリを追加、バージョンを更新

3. **環境変数や設定を変更した時**
   - `firebase.json` の設定を変更した場合
   - 例: リージョン変更、メモリ設定変更

### ❌ **デプロイが不要な場合**

1. **フロントエンドのコードのみ変更**
   - `app/` 配下のファイルを編集した場合
   - `components/` 配下のファイルを編集した場合
   - 例: UIの変更、スタイルの変更

2. **Firestoreのセキュリティルールのみ変更**
   - `firestore.rules` を変更した場合
   - 例: アクセス権限の変更

3. **環境変数のみ変更**
   - `.env.local` を変更した場合（フロントエンド用）
   - 例: `NEXT_PUBLIC_FUNCTIONS_URL` の変更

## デプロイコマンド

ルートディレクトリから実行できます：

```bash
# すべてのCloud Functionsをデプロイ
npm run functions:deploy

# ビルドのみ（デプロイしない）
npm run functions:build

# 特定の関数のみデプロイ（高速）
npm run functions:deploy:timer    # タイマー機能のみ
npm run functions:deploy:drive    # Drive連携のみ
npm run functions:deploy:github   # GitHub連携のみ
```

## デプロイの流れ

1. **ビルド**: TypeScriptをJavaScriptにコンパイル
2. **パッケージング**: 必要なファイルをまとめる
3. **アップロード**: GCPにアップロード
4. **デプロイ**: Cloud Functionsとしてデプロイ
5. **URL発行**: 各関数にURLが割り当てられる

## 注意事項

- デプロイには数分かかることがあります
- デプロイ中は関数が一時的に利用できなくなる場合があります
- エラーが発生した場合は、ログを確認してください：
  ```bash
  firebase functions:log
  ```

## よくある質問

### Q: なぜフロントエンドから直接Firestoreに書き込まないの？

A: セキュリティとビジネスロジックの分離のためです。
- 認証情報をフロントエンドに公開できない
- 複雑な処理（排他制御、計算など）をサーバー側で行う
- セキュリティルールをシンプルに保つ

### Q: デプロイは毎回必要？

A: Cloud Functionsのコードを変更した場合のみ必要です。フロントエンドの変更だけなら不要です。

### Q: デプロイに時間がかかる

A: 初回デプロイは時間がかかりますが、2回目以降は差分のみデプロイされるため、比較的速いです。特定の関数のみデプロイするコマンドを使うとさらに速くなります。

