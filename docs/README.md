# ドキュメント一覧

このディレクトリには、プロジェクトのドキュメントが整理されています。

## ディレクトリ構造

```
docs/
├── README.md (このファイル)
├── setup/          # 初期構築フェーズのドキュメント
│   ├── INITIAL_SETUP.md              # 初期セットアップ手順（Phase 1-6）
│   ├── CHECKLIST.md                  # Firebase初期設定チェックリスト
│   ├── FIREBASE.md                   # Firebase設定手順
│   ├── FIREBASE_PROJECT.md           # Firebaseプロジェクト設定
│   ├── FIREBASE_AUTH_DOMAIN_FIX.md   # Firebase認証ドメイン設定のトラブルシューティング
│   ├── ENV.md                        # 環境変数設定
│   ├── USER_REGISTRATION.md          # ユーザー登録手順
│   ├── SECRETS_CREATE.md             # GCP Secret ManagerでのSecrets作成手順
│   ├── SECRETS_ACCESS.md              # Cloud FunctionsへのSecretsアクセス権限付与手順
│   ├── SECRET_MANAGER.md             # GCP Secret Managerの説明
│   ├── SECRET_MANAGER_ALTERNATIVES.md # Secret Managerの選択肢比較
│   └── SECRET_MANAGER_COST.md        # Secret Managerのコスト見積もり
└── operations/     # 運用フェーズのドキュメント
    ├── GITHUB_TOKEN_RENEWAL.md       # GitHubトークン更新手順
    └── TROUBLESHOOTING.md            # 運用時のトラブルシューティング
```

## ドキュメントの使い分け

### 初期構築フェーズ (`setup/`)

プロジェクトを初めてセットアップする際に必要なドキュメントです。

- **`INITIAL_SETUP.md`**: 初期セットアップの全体手順（Phase 1-6）
- **`CHECKLIST.md`**: Firebase初期設定のチェックリスト
- **`FIREBASE.md`**: Firebase設定の詳細手順
- **`ENV.md`**: 環境変数の設定方法
- **`SECRETS_CREATE.md`**: GCP Secret ManagerでのSecrets作成手順
- **`SECRETS_ACCESS.md`**: Cloud FunctionsへのSecretsアクセス権限付与手順

### 運用フェーズ (`operations/`)

プロジェクトが稼働した後に参照するドキュメントです。

- **`GITHUB_TOKEN_RENEWAL.md`**: GitHubトークンの有効期限が切れた際の更新手順
- **`TROUBLESHOOTING.md`**: 運用時に発生する可能性のある問題と対処法

## クイックリファレンス

### 初めてセットアップする場合

1. `setup/INITIAL_SETUP.md` を最初に読む
2. 各Phaseで必要に応じて詳細ドキュメントを参照

### GitHubトークンが期限切れになった場合

`operations/GITHUB_TOKEN_RENEWAL.md` を参照

### エラーが発生した場合

1. `operations/TROUBLESHOOTING.md` を確認
2. 該当するエラーが見つからない場合は、GCP ConsoleやFirebase Consoleのログを確認

## 注意事項

- `setup/INITIAL_SETUP.md` は初期セットアップ時のみ参照するドキュメントです
- 運用開始後は `operations/` ディレクトリのドキュメントを参照してください

