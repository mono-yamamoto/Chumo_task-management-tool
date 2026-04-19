# Chumo - タスク管理ツール

小規模チーム向けのタスク管理ツール。Backlog連携・時間計測・Google Drive/GitHub連携機能を備え、チームの業務進捗を一元管理します。

## 主要機能

- **タスク管理** — テーブル / カードビュー切替、ステータス・ラベル・担当者でフィルタリング
- **Backlog連携** — Backlog課題の同期・Webhook受信による自動更新
- **時間計測** — タスク単位のタイマー機能、作業セッション記録
- **レポート** — 作業時間の集計・可視化
- **連絡先管理** — チームメンバー・関係者の情報管理
- **コメント** — タスクごとのコメント・通知
- **外部連携** — Google Drive / GitHub / Google Chat 連携
- **ファイルアップロード** — 画像・添付ファイル（Cloudflare R2 ストレージ）
- **通知** — タスク更新・コメントの通知機能
- **設定** — プロフィール / 連携 / 通知 / 管理者設定

## 技術スタック

| 項目             | フロントエンド                                          | バックエンド                |
| ---------------- | ------------------------------------------------------- | --------------------------- |
| フレームワーク   | Vite + React 19                                         | Hono on Cloudflare Workers  |
| UI/スタイル      | Tailwind CSS v4 + React Aria Components + Framer Motion | —                           |
| 認証             | Clerk (`@clerk/clerk-react`)                            | Clerk (`@clerk/backend`)    |
| DB               | —                                                       | Neon Postgres + Drizzle ORM |
| ストレージ       | —                                                       | Cloudflare R2               |
| ルーティング     | react-router-dom v7                                     | Hono Router                 |
| テスト           | —                                                       | Vitest                      |
| Linter/Formatter | oxlint + oxfmt                                          | oxlint + oxfmt              |

## ディレクトリ構成

```
/
├── frontend/          # フロントエンド（Vite + React 19）
│   └── src/
│       ├── components/  # UI コンポーネント（layout / shared / ui）
│       ├── hooks/       # カスタムフック
│       ├── lib/         # API クライアント、定数
│       ├── pages/       # ページコンポーネント
│       └── types/       # 型定義
├── backend/           # バックエンド（Hono + Cloudflare Workers）
│   └── src/
│       ├── db/          # Drizzle スキーマ、マイグレーション
│       ├── lib/         # ビジネスロジック
│       ├── middleware/  # 認証、DB接続
│       └── routes/      # APIルート
├── designs/           # Pencil デザインファイル（.pen）
├── docs/              # 設計ドキュメント、仕様書
└── scripts/           # ユーティリティスクリプト
```

## クイックスタート

```bash
# 依存関係インストール
bun install                  # ルート（lefthook等）
cd frontend && bun install   # フロントエンド
cd backend && bun install    # バックエンド

# 開発サーバー起動（フロント + バック同時）
bun run dev
```

- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:8787

> 環境変数の設定・Git Hooks・Docker など詳細なセットアップ手順は [SETUP.md](./SETUP.md) を参照してください。

## 開発コマンド

### 一括実行

```bash
bun run dev                  # フロント + バック同時起動
bun run build                # フロントエンドビルド
bun run lint                 # フロント + バック lint（oxlint）
bun run type-check           # フロント + バック型チェック
bun run test                 # バックエンドテスト（Vitest）
```

### フロントエンド個別

```bash
bun run frontend:dev         # 開発サーバー起動
bun run frontend:build       # ビルド
bun run frontend:lint        # lint（oxlint）
bun run frontend:format      # フォーマット（oxfmt）
bun run frontend:type-check  # 型チェック
```

### バックエンド個別

```bash
bun run backend:dev          # 開発サーバー起動（Docker DB自動起動）
bun run backend:deploy       # デプロイ（Cloudflare Workers）
bun run backend:lint         # lint（oxlint）
bun run backend:format       # フォーマット（oxfmt）
bun run backend:test         # テスト（Vitest）
bun run backend:test:coverage # カバレッジ付きテスト
bun run backend:type-check   # 型チェック（※ルートのtype-checkに含まれる）
bun run backend:db:generate  # Drizzle マイグレーション生成
bun run backend:db:migrate   # Drizzle マイグレーション適用
bun run backend:db:studio    # Drizzle Studio（DB GUI）
```
