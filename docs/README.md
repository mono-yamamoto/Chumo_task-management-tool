# ドキュメント一覧

このディレクトリには、プロジェクトのドキュメントが整理されています。

## ディレクトリ構造

```
docs/
├── README.md (このファイル)
├── specs/              # 機能仕様書
│   ├── _template.md
│   ├── dashboard/
│   ├── settings/
│   └── shared/
├── design-renewal/     # デザインリニューアル関連
│   ├── backend-stack-migration.md
│   ├── ui-stack-migration.md
│   ├── staging-environment.md
│   ├── testing-strategy.md
│   └── pending-items.md
└── operations/         # 運用ドキュメント
    ├── GITHUB_TOKEN_RENEWAL.md
    ├── TROUBLESHOOTING.md
    └── BACKLOG_WEBHOOK_SECRET.md
```

## ドキュメントの使い分け

### 機能仕様書 (`specs/`)

各機能の仕様書。新機能の実装前に参照。

### デザインリニューアル (`design-renewal/`)

Next.js+MUI から Vite+React+Tailwind への移行計画と経緯。

### 運用ドキュメント (`operations/`)

- **`GITHUB_TOKEN_RENEWAL.md`**: GitHubトークン更新手順
- **`TROUBLESHOOTING.md`**: 運用時のトラブルシューティング
- **`BACKLOG_WEBHOOK_SECRET.md`**: Backlog Webhook シークレット管理
