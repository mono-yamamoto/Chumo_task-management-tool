# Google Drive連携のトラブルシューティング

## エラー: `400: redirect_uri_mismatch`

### 症状
- 特定のユーザーだけGoogle Drive連携ができる
- 他のユーザーは「400: redirect_uri_mismatch」エラーが表示される

### 原因
Google Cloud Consoleに登録されているリダイレクトURIと、アプリケーションが使用しているリダイレクトURIが一致していないため。

### 解決方法

#### 1. Google Cloud Consoleの設定確認

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. プロジェクト `chumo-3506a` を選択
3. 「APIとサービス」→「認証情報」を開く
4. OAuth 2.0クライアントIDを選択
5. 「承認済みのリダイレクトURI」を確認

**必要な設定**:
```
http://localhost:3000/api/auth/google/callback
https://chumo-task.vercel.app/api/auth/google/callback
```

もし `https://chumo-task.vercel.app/api/auth/google/callback` が登録されていない場合は、追加して保存してください。

#### 2. 環境変数の設定確認

**ローカル開発環境** (`.env.local`):
```env
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

**本番環境** (Vercel環境変数):

| 変数名 | 値 |
|--------|-----|
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://chumo-task.vercel.app/api/auth/google/callback` |

Vercel環境変数の設定方法:
1. Vercelダッシュボードでプロジェクトを開く
2. Settings → Environment Variables
3. 上記の環境変数を追加
4. 環境: Production を選択
5. Save

#### 3. デプロイの確認

環境変数を変更した後は、再デプロイが必要です:
- Vercel: 自動的に再デプロイされます（手動の場合は Deployments → Redeploy）

### 確認方法

設定が正しく反映されているか確認:

1. ブラウザのデベロッパーツールを開く
2. 設定ページで「Google Driveと連携」ボタンをクリック
3. Networkタブで `/api/auth/google` リクエストを確認
4. レスポンスの `authUrl` に含まれる `redirect_uri` パラメータを確認

**期待される値**:
- ローカル: `http://localhost:3000/api/auth/google/callback`
- 本番: `https://chumo-task.vercel.app/api/auth/google/callback`

### 参考資料

- [Google OAuth 2.0 認証](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API OAuth設定](../DRIVE_OAUTH_IMPLEMENTATION.md)
- [環境変数設定ガイド](../setup/ENV.md)
