# Google Drive OAuth エラーのデバッグガイド

## 概要

Google Drive連携で `400: redirect_uri_mismatch` エラーが発生する場合のデバッグ手順を説明します。

## エラーの原因

`400: redirect_uri_mismatch` エラーは、以下の2つのリダイレクトURIが一致しない場合に発生します:

1. **コードで生成されるリダイレクトURI**: OAuth認証URLを生成する際に使用されるURI
2. **Google Cloud Consoleに登録されているURI**: OAuth 2.0クライアントIDの「承認済みのリダイレクトURI」

## デバッグ手順

### ステップ1: コードで使用されているリダイレクトURIを確認

デバッグログが有効になっているため、以下の手順でリダイレクトURIを確認できます:

1. 本番環境（https://chumo-task.vercel.app）にアクセス
2. 設定ページを開く
3. 「Google Driveと連携」ボタンをクリック
4. Vercelのログを確認（Dashboard → Deployments → 最新デプロイ → Functions → Logs）

ログに以下のような出力が表示されます:

```
[OAuth Debug] Redirect URI being used: https://chumo-task.vercel.app/api/auth/google/callback
[OAuth Debug] Environment variables: {
  GOOGLE_OAUTH_REDIRECT_URI: 'SET',
  SERVER_URL: 'NOT SET',
  NEXT_PUBLIC_FUNCTIONS_URL: 'https://asia-northeast1-chumo-3506a.cloudfunctions.net/functions'
}
```

### ステップ2: Google Cloud Consoleの設定を確認

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. プロジェクト `chumo-3506a` を選択
3. 「APIとサービス」→「認証情報」を開く
4. OAuth 2.0クライアントIDを選択
5. 「承認済みのリダイレクトURI」セクションを確認

**登録されているべきURI**:
- `http://localhost:3000/api/auth/google/callback` (開発環境用)
- `https://chumo-task.vercel.app/api/auth/google/callback` (本番環境用)

### ステップ3: Vercelの環境変数を確認

1. [Vercel Dashboard](https://vercel.com) にアクセス
2. プロジェクトを選択
3. Settings → Environment Variables を開く

**設定されているべき環境変数** (Production環境):

| 変数名 | 値 | 必須 |
|--------|-----|------|
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://chumo-task.vercel.app/api/auth/google/callback` | ✅ **必須** |
| `GOOGLE_OAUTH_CLIENT_ID` | Google Cloud Consoleから取得したクライアントID | ✅ 必須 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Consoleから取得したクライアントシークレット | ✅ 必須 |

**重要**: 環境変数を追加・変更した場合、Vercelは自動的に再デプロイを開始します。デプロイが完了するまで2〜3分待ってから再度テストしてください。

## よくある問題と解決策

### 問題1: 環境変数が設定されていない

**症状**: ログに `GOOGLE_OAUTH_REDIRECT_URI: 'NOT SET'` と表示される

**解決策**:
1. Vercel Dashboardで環境変数を追加
2. 変数名: `GOOGLE_OAUTH_REDIRECT_URI`
3. 値: `https://chumo-task.vercel.app/api/auth/google/callback`
4. Environment: `Production` を選択
5. 保存後、自動デプロイが完了するまで待機

### 問題2: Google Cloud ConsoleにリダイレクトURIが登録されていない

**症状**: ログに正しいURIが表示されるが、Googleのエラーページが表示される

**解決策**:
1. Google Cloud Consoleで OAuth 2.0クライアントIDを編集
2. 「承認済みのリダイレクトURI」に以下を追加:
   ```
   https://chumo-task.vercel.app/api/auth/google/callback
   ```
3. 保存
4. 即座に反映されるため、再度テスト

### 問題3: 環境変数の反映待ち

**症状**: 環境変数を設定したばかりで、まだエラーが発生する

**解決策**:
1. Vercel Dashboardで最新のデプロイを確認
2. デプロイステータスが "Ready" になるまで待機（2〜3分）
3. ブラウザのキャッシュをクリア（Ctrl+Shift+R または Cmd+Shift+R）
4. 再度テスト

### 問題4: 間違ったリダイレクトURIが使用されている

**症状**: ログに `https://asia-northeast1-chumo-3506a.cloudfunctions.net/api/auth/google/callback` などの誤ったURIが表示される

**原因**: `GOOGLE_OAUTH_REDIRECT_URI` 環境変数が設定されていないため、フォールバック処理で `NEXT_PUBLIC_FUNCTIONS_URL` から生成されています

**解決策**: 問題1の解決策を参照

## リダイレクトURI決定のロジック

コードは以下の優先順位でリダイレクトURIを決定します (`app/api/auth/google/route.ts:6-19`):

```typescript
function getRedirectUri(): string {
  // 優先順位: GOOGLE_OAUTH_REDIRECT_URI > SERVER_URL > NEXT_PUBLIC_FUNCTIONS_URL > localhost
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }

  const baseUrl =
    process.env.SERVER_URL ||
    (process.env.NEXT_PUBLIC_FUNCTIONS_URL
      ? process.env.NEXT_PUBLIC_FUNCTIONS_URL.replace('/functions', '')
      : 'http://localhost:3000');

  return `${baseUrl}/api/auth/google/callback`;
}
```

**推奨**: 本番環境では必ず `GOOGLE_OAUTH_REDIRECT_URI` を明示的に設定してください。

## 検証手順

### 1. ローカル開発環境での確認

```bash
# .env.localに以下を設定
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
```

```bash
# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000/settings にアクセスし、「Google Driveと連携」をクリック

### 2. 本番環境での確認

1. Vercel環境変数を設定（ステップ3参照）
2. デプロイ完了を待機
3. https://chumo-task.vercel.app/settings にアクセス
4. 「Google Driveと連携」をクリック
5. VercelログでリダイレクトURIを確認

### 3. 成功時の動作

1. Googleログインページにリダイレクト
2. アカウントを選択
3. 権限承認画面が表示される
4. 承認後、設定ページにリダイレクト
5. 「連携済み」と表示される

## 参考情報

- [Google OAuth 2.0 認証](https://developers.google.com/identity/protocols/oauth2)
- [Vercel環境変数ドキュメント](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js環境変数ガイド](https://nextjs.org/docs/basic-features/environment-variables)
