# Make Webhook設定

## 概要
Backlogからタスクを自動同期するためのMake Webhook設定

## ステータス
- [ ] 未実装（後回し）

## 必要な作業

### 1. Make Webhook作成
1. Makeで新しいシナリオを作成
2. Backlogモジュールを追加
3. 「Webhook」モジュールを追加
4. Webhook URL: `https://us-central1-chumo-3506a.cloudfunctions.net/syncBacklog`
5. HTTPメソッド: POST
6. 認証: カスタムヘッダー
   - ヘッダー名: `Authorization`
   - ヘッダー値: `Bearer <MAKE_WEBHOOK_SECRETの値>`
7. Webhook秘密鍵をコピー（GCP Secret Managerに保存済みの値と一致させる）

### 2. Backlogトリガー設定
1. Backlogモジュールで「課題作成」イベントを選択
2. プロジェクトキーを指定
3. Webhookにデータを送信する設定

### 3. GCP Secret Manager設定
`MAKE_WEBHOOK_SECRET`を作成する必要があります（まだ作成していない場合）

## 参考
- Cloud Function: `functions/src/sync/backlog.ts`
- 詳細手順: `docs/setup/INITIAL_SETUP.md` Phase 4

