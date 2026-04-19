# バックエンド移行: 未対応事項一覧

Phase 0〜6 完了時点（2026-03-07）での未対応・保留事項。

---

## 1. プッシュ通知: FCM → Web Push API 移行

**状態:** 未着手
**理由:** Cloudflare Workers で Firebase Admin SDK が動作しないため、FCM によるプッシュ送信ができない。フロントの FCM トークン取得（Firebase Messaging SDK）も残存。

**影響範囲:**

- `lib/firebase/config.ts` — Firebase app 初期化（messaging.ts からのみ参照）
- `lib/firebase/messaging.ts` — FCM トークン取得・フォアグラウンドメッセージ受信
- `hooks/useFcmToken.ts` — FCM トークン管理フック
- `components/notifications/NotificationSettings.tsx` — 通知設定 UI
- `backend/src/routes/notifications.ts:104` — `TODO: Web Push API で実際に送信する`
- `public/firebase-messaging-sw.js` — FCM 用 Service Worker（存在する場合）

**対応方針:** Web Push API（RFC 8030）+ VAPID に移行。バックエンドは `web-push` ライブラリ相当の実装、フロントは標準の Push API + Service Worker に置き換え。

---

## 2. `isAllowed` によるアクセス制御が未実装

**状態:** 未実装
**理由:** Firebase Auth → Clerk 移行時に認証フローを書き換えたが、`isAllowed` チェックが新しいフローに含まれていない。

**現状の動作:** DB の `users` テーブルにメールアドレスが存在すれば、`isAllowed: false` でもログイン・ダッシュボードアクセスが可能。

**影響範囲:**

- `backend/src/routes/users.ts` — `/me` エンドポイントが `isAllowed` を見ていない
- `components/auth/AuthGuard.tsx` — `user.isAllowed` のチェックがない

**対応方針:** バックエンド（`/api/users/me`）またはフロント（`AuthGuard`）のどちらかで `isAllowed === false` の場合にアクセスを拒否するロジックを追加。

---

## 3. ステージングフロントエンドのデプロイ

**状態:** 未構築
**理由:** バックエンド API とDB のステージング環境は構築済みだが、フロントは localhost からステージング API に接続して検証している状態。

**仕様:** `docs/design-renewal/staging-environment.md` に記載の通り Cloudflare Pages（Preview デプロイ）を使用。

**必要な作業:**

- Cloudflare Pages プロジェクト作成 + Git リポジトリ接続
- ビルド設定（Production branch: `main`）
- Preview 環境変数の設定（`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` 等）
- チームメンバーがアクセスできる URL の共有

---

## 4. Phase 7: 本番切替

**状態:** 未着手
**理由:** ステージング検証完了後、チーム受け入れテストを経てから実施する予定。

**必要な作業:**

- Clerk Production インスタンス作成
- Cloudflare Workers / Pages の本番ドメイン設定
- DNS 切り替え
- 差分データ移行（`updatedAt` が前回移行後のレコード）
- メンテナンス画面表示 → 切替 → 解除
- Firebase Firestore ルールを read-only に変更（1〜2 週間のフォールバック期間）

詳細手順は `docs/design-renewal/staging-environment.md` の Phase 7 セクション参照。

---

## 5. Clerk ID 移行の一時的処理

**状態:** 稼働中（一時的）
**理由:** Firebase UID と Clerk ID が異なるため、初回ログイン時にメールアドレスでマッチして ID を更新する処理が `/api/users/me` に入っている。

**該当コード:** `backend/src/routes/users.ts` の `/me` エンドポイント内 ID 移行ロジック

**注意点:**

- 全ユーザーが一度ログインすれば ID 移行は完了する
- neon-http ドライバーの制約でトランザクションなしの逐次実行になっている
- 全ユーザーの移行完了後、このロジックは削除して良い

---

## 6. Backlog Webhook 署名検証

**状態:** 未実装
**理由:** 旧 Cloud Functions 時代から未実装のまま移植された。

**該当コード:** `backend/src/routes/backlog.ts`（旧: `functions/src/sync/backlog.ts:40` に `TODO: 署名検証` あり）

**対応方針:** Backlog の Webhook 署名ヘッダーを検証するミドルウェアを追加。
