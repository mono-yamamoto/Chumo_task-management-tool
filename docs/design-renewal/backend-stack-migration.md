# バックエンドスタック移行プラン（Firebase → Neon 構成）

## ステータス: Proposed（方針ほぼ確定）

## Context

現在のバックエンドは Firebase に全面依存しており、Firestore（DB）、Firebase Auth（認証）、Cloud Functions（サーバーロジック）、Firebase Storage（ストレージ）で構成されている。UIリニューアル（MUI → Tailwind + React Aria）と合わせて、バックエンドも脱 Firebase し、SQL ベースのモダンなスタックに移行する。

### 移行の動機

- **集計・レポート機能の限界**: Firestore では `GROUP BY` / `JOIN` ができず、全件取得 → JS 側で計算が必要
- **複雑な検索の制約**: Firestore のクエリ制限（複合インデックス必須、OR 条件の制約等）
- **学習価値**: SQL、API 設計、フロント/バック分離など業界標準のスキルを習得する
- **ステージング環境の手軽さ**: Neon のブランチングで $0 でステージング構築可能

### 現状の Firebase 依存

| 役割              | 現在のサービス   | Cloud Functions                    |
| ----------------- | ---------------- | ---------------------------------- |
| DB                | Firestore        | -                                  |
| 認証              | Firebase Auth    | -                                  |
| ストレージ        | Firebase Storage | -                                  |
| タイマー          | -                | startTimer, stopTimer              |
| Google Drive 連携 | -                | createDriveFolder                  |
| GitHub Issue 作成 | -                | createFireIssue                    |
| Google Chat 連携  | -                | createGoogleChatThread             |
| レポート          | -                | getTimeReport, exportTimeReportCSV |
| お問い合わせ      | -                | createContactIssue                 |
| Backlog 同期      | -                | syncBacklog, webhookBacklog        |
| 通知              | -                | onCommentCreate                    |

---

## 新スタック

| 種別                     | 選定                                       | 理由                                               |
| ------------------------ | ------------------------------------------ | -------------------------------------------------- |
| フロントエンド           | **React (Vite)**                           | SPA として純粋に使う。Next.js は外す（後述）       |
| バックエンド             | **Hono**                                   | 超軽量（14KB）、TypeScript ネイティブ、Edge 対応   |
| DB                       | **Neon (PostgreSQL)**                      | サーバーレス PostgreSQL。ブランチング機能が強力    |
| ORM                      | **Drizzle**                                | SQL に近い書き味、TypeScript 完全対応、軽量        |
| 認証                     | **Clerk**（Phase 1）→ **Lucia**（Phase 2） | 初期は Clerk で速度優先、後で Lucia に移行して学習 |
| ストレージ               | **Cloudflare R2**                          | S3 互換、10GB 無料、エグレス無料                   |
| ホスティング（フロント） | **Cloudflare Pages**                       | 無制限帯域、git push で自動デプロイ                |
| ホスティング（API）      | **Cloudflare Workers**                     | 無料枠大（10万リクエスト/日）、Hono と最適統合     |

### Next.js を外す理由

- 現状 Next.js の強み（SSR / Server Components / API Routes）をほぼ活用できていない
- 実質 React SPA として使っており、Vite の方がビルド速度・開発体験が良い
- フロントとバックを分離することで、API 設計・通信の仕組みを学べる
- Cloud Functions がなくなるため Hono で API サーバーを立てるが、Next.js と Hono を併用するのは冗長

### Hono を選ぶ理由（vs Express）

| 観点       | Hono                              | Express                |
| ---------- | --------------------------------- | ---------------------- |
| TypeScript | ネイティブ対応                    | 後付け（@types 必要）  |
| サイズ     | 14KB                              | 約200KB                |
| Edge 対応  | Cloudflare Workers / Deno / Bun   | Node.js のみ           |
| 設計       | Web Standard API ベース（モダン） | コールバック時代の設計 |
| 将来性     | 急成長中                          | 安定だがレガシー寄り   |

### Drizzle を選ぶ理由（vs Prisma）

| 観点             | Drizzle                        | Prisma                    |
| ---------------- | ------------------------------ | ------------------------- |
| SQL との距離     | SQL に近い書き味（学習に最適） | 独自 DSL（魔法感が強い）  |
| バンドルサイズ   | 軽量                           | 重い（Rust エンジン同梱） |
| Edge 対応        | Cloudflare Workers で動く      | Edge 対応は限定的         |
| マイグレーション | SQL ベース                     | 独自形式                  |

---

## アーキテクチャ

### 通信フロー

```mermaid
sequenceDiagram
    participant B as ブラウザ (React SPA)
    participant H as Hono API (Cloudflare Workers)
    participant D as Neon (PostgreSQL)

    B->>H: fetch('/api/tasks')
    H->>D: Drizzle ORM → SQL クエリ
    D-->>H: クエリ結果
    H-->>B: JSON レスポンス
    Note over B: 画面表示
```

### 認証フロー（Clerk）

```mermaid
sequenceDiagram
    participant B as ブラウザ
    participant C as Clerk サーバー
    participant G as Google OAuth
    participant H as Hono API

    B->>C: 「Google でログイン」
    C->>G: OAuth 認証リクエスト
    G-->>C: 認証成功
    C-->>B: セッション Cookie 発行
    B->>H: Cookie 付きで API リクエスト
    H->>C: Cookie 検証
    C-->>H: ユーザー情報
    Note over H: ビジネスロジック実行
    H-->>B: レスポンス
```

### デプロイ構成

```mermaid
graph TB
    subgraph "Cloudflare"
        CP[Cloudflare Pages<br/>フロントエンド]
        CW[Cloudflare Workers<br/>Hono API]
        R2[Cloudflare R2<br/>ストレージ]
    end

    subgraph "外部サービス"
        NE[Neon<br/>PostgreSQL]
        CL[Clerk<br/>認証]
    end

    CP -->|API リクエスト| CW
    CW -->|SQL| NE
    CW -->|ファイル操作| R2
    CW -->|セッション検証| CL
```

### フォルダ構成

```
project/
├── frontend/                ← React (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── lib/
│   │       └── api.ts       ← API クライアント
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                 ← Hono
│   ├── src/
│   │   ├── routes/
│   │   │   ├── tasks.ts      ← /api/tasks
│   │   │   ├── auth.ts       ← /api/auth
│   │   │   ├── reports.ts    ← /api/reports
│   │   │   ├── timer.ts      ← /api/timer
│   │   │   ├── drive.ts      ← /api/drive
│   │   │   ├── github.ts     ← /api/github
│   │   │   └── chat.ts       ← /api/chat
│   │   ├── db/
│   │   │   ├── schema.ts     ← テーブル定義（Drizzle）
│   │   │   ├── migrations/   ← マイグレーションファイル
│   │   │   └── index.ts      ← DB 接続
│   │   ├── middleware/
│   │   │   └── auth.ts       ← 認証チェック（差し替え可能に設計）
│   │   └── index.ts          ← エントリポイント
│   ├── drizzle.config.ts
│   └── package.json
│
├── docker-compose.yml       ← ローカル DB 起動用
└── README.md
```

---

## ローカル開発環境

### 必要なもの

- Node.js / Bun（ランタイム）
- Docker（ローカル PostgreSQL 用。Neon の dev ブランチで代替可）
- 環境変数（`.env.local`）

### docker-compose.yml

```yaml
services:
  db:
    image: postgres:16
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: chumo
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 起動手順

```bash
# DB 起動
docker compose up -d

# バックエンド起動
cd backend && bun run dev    # → http://localhost:3001

# フロントエンド起動
cd frontend && bun run dev   # → http://localhost:5173
```

### 環境変数

```bash
# .env.local（ローカル開発用）
DATABASE_URL=postgresql://dev:dev@localhost:5432/chumo
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

```bash
# .env.production（本番用）
DATABASE_URL=postgresql://user:pass@xxx.neon.tech/chumo
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
```

### Docker を使わない場合

Neon の dev ブランチに直接接続する方法もある。オフライン開発不可だが Docker のセットアップが不要。

```bash
# .env.local
DATABASE_URL=postgresql://user:pass@xxx.neon.tech/chumo-dev
```

---

## ステージング環境

### 構成（Firebase 版から大幅に簡素化）

```mermaid
graph LR
    subgraph "本番環境"
        M[main ブランチ] --> CP_P[Cloudflare Pages]
        M --> CW_P[Cloudflare Workers]
        CW_P --> NE_M[Neon main ブランチ]
    end

    subgraph "ステージング環境"
        S[staging ブランチ] --> CP_S[Cloudflare Preview]
        S --> CW_S[Workers staging]
        CW_S --> NE_S[Neon staging ブランチ]
    end

    NE_M -.->|ブランチコピー| NE_S
```

### 追加費用: $0

| サービス           | ステージング                           | 追加費用 |
| ------------------ | -------------------------------------- | -------- |
| Neon               | staging ブランチ（本番データのコピー） | $0       |
| Cloudflare Pages   | Preview デプロイ（自動生成）           | $0       |
| Cloudflare Workers | staging 環境                           | $0       |
| Clerk              | Development インスタンス               | $0       |

### セットアップ

```bash
# Neon staging ブランチ作成（1コマンド）
neonctl branches create --name staging

# Cloudflare Pages の設定（ダッシュボードで一度だけ）
# Preview branch: staging
# Production branch: main

# 以降は git push するだけで自動デプロイ
```

---

## 認証戦略

### Phase 1: Clerk（リニューアル初期）

- Google OAuth のみ、10分で認証完成
- リニューアルの他の部分（UI、DB、API）に集中できる
- 10,000 MAU まで無料

### Phase 2: Lucia（落ち着いてから）

- 認証の仕組み（セッション、Cookie、OAuth フロー）を学習するため
- パスワードを扱わず Google OAuth のみなら、セキュリティリスクは低い
- 完全無料（OSS ライブラリ）

### 認証レイヤーの設計（乗り換え容易化）

認証ロジックを1ファイルに閉じ込め、Clerk → Lucia の移行時に差し替えるファイルを最小化する。

```typescript
// middleware/auth.ts ← このファイルだけ差し替えればOK

// Phase 1: Clerk 版
import { clerkMiddleware } from '@clerk/hono';
export const authMiddleware = clerkMiddleware();
export function getCurrentUser(c: Context): User {
  return c.get('clerkAuth');
}

// Phase 2: Lucia 版（将来）
// import { lucia } from '../lib/auth';
// export const authMiddleware = async (c, next) => { ... };
// export function getCurrentUser(c: Context): User { ... };
```

```typescript
// routes/tasks.ts（認証ライブラリを直接知らない）
import { authMiddleware, getCurrentUser } from '../middleware/auth';

app.get('/api/tasks', authMiddleware, async (c) => {
  const user = getCurrentUser(c);
  // ...
});
```

---

## リアルタイム同期について

### 方針: 不要（TanStack Query の自動再取得で代替）

タスク管理ツールの特性上、チャットアプリや共同編集のようなリアルタイム性は不要。TanStack Query（既に導入済み）の `refetchInterval` で「ほぼリアルタイム」を実現する。

```typescript
const { data: tasks } = useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  refetchInterval: 30000, // 30秒ごとに自動再取得
});
```

将来 WebSocket が必要になった場合は、Hono の WebSocket 対応で追加可能。

---

## 料金比較

### 新構成の月額目安

| サービス           | 無料枠            | 超過時    |
| ------------------ | ----------------- | --------- |
| Neon (DB)          | 0.5GB / 月191時間 | $19/月〜  |
| Cloudflare Pages   | 無制限帯域        | $0        |
| Cloudflare Workers | 10万リクエスト/日 | $5/月〜   |
| Clerk              | 10,000 MAU        | $0.02/MAU |
| Cloudflare R2      | 10GB              | $0.015/GB |

**小〜中規模（チーム利用）なら $0/月で運用可能。**

### Firebase との比較

| 観点                 | Firebase                           | Neon 構成              |
| -------------------- | ---------------------------------- | ---------------------- |
| 開始コスト           | 無料                               | 無料                   |
| スケール時の予測性   | 従量課金で読みにくい               | プラン制で予測しやすい |
| ステージング追加費用 | Blaze プラン必須（別プロジェクト） | $0（ブランチ機能）     |

---

## Cloud Functions の移行先マッピング

| Cloud Function               | 移行先                                                | 備考                                                                   |
| ---------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| startTimer / stopTimer       | `POST /api/timer/start`, `POST /api/timer/stop`       | Hono Route Handler                                                     |
| createDriveFolder            | `POST /api/drive/folders`                             | Google APIs SDK はそのまま使用                                         |
| createFireIssue              | `POST /api/github/issues`                             | Octokit はそのまま使用                                                 |
| createGoogleChatThread       | `POST /api/chat/threads`                              | Webhook URL 呼び出し                                                   |
| getTimeReport                | `GET /api/reports/time`                               | SQL で集計（大幅に簡素化される）                                       |
| exportTimeReportCSV          | `GET /api/reports/time/csv`                           | SQL → CSV 変換                                                         |
| createContactIssue           | `POST /api/contact`                                   | Octokit で GitHub Issue 作成 + DB に Issue URL 保存                    |
| syncBacklog / webhookBacklog | `POST /api/backlog/sync`, `POST /api/backlog/webhook` | Backlog Webhook 受信 → タスク upsert。カスタムフィールドパース処理あり |
| onCommentCreate              | `POST /api/notifications` (API トリガー)              | Firestore トリガー → API 呼び出しに変更                                |

---

## テストでの認証

テストでは本物の Google 認証を通さず、認証を「モック」する。

| テスト種別               | 手法                                                 |
| ------------------------ | ---------------------------------------------------- |
| API テスト（Vitest）     | 認証ミドルウェアをモック（偽のユーザー情報をセット） |
| E2E テスト（Playwright） | Clerk Testing Token（認証済み状態を直接作成）        |
| コンポーネントテスト     | useAuth 等の hooks をモック                          |

---

## 移行フェーズ（案）

| Phase   | 内容                                            | 前提                |
| ------- | ----------------------------------------------- | ------------------- |
| Phase 1 | DB 設計 + Drizzle スキーマ + マイグレーション   | Neon アカウント作成 |
| Phase 2 | Hono API サーバー構築（CRUD 系）                | Phase 1 完了        |
| Phase 3 | Clerk 認証統合                                  | Phase 2 完了        |
| Phase 4 | React (Vite) フロント構築 + API 接続            | Phase 2 完了        |
| Phase 5 | 外部連携移行（Drive / GitHub / Chat / Backlog） | Phase 2 完了        |
| Phase 6 | ステージング環境構築 + 動作検証                 | Phase 3-5 完了      |
| Phase 7 | データ移行（Firestore → Neon）                  | Phase 6 完了        |
| Phase 8 | 本番切替                                        | Phase 7 完了        |

---

## 注意事項

- **Firestore → PostgreSQL のデータ移行**: スキーマ設計後にマイグレーションスクリプトを作成する必要がある
- **Google Drive / GitHub / Chat 連携**: API キーやトークンの管理方法が変わる（Firebase Secret Manager → 環境変数 or Cloudflare Secrets）
- **Firestore トリガー（onCommentCreate）**: Firestore のドキュメント作成をトリガーにしていた処理は、API 呼び出し時に明示的に通知処理を実行する形に変更
- **既存ドキュメントへの影響**: `staging-environment.md` と `testing-strategy.md` は Firebase ベースで書かれており、本移行後に更新が必要
