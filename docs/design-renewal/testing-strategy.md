# テスト戦略

## Context

UIリニューアル + バックエンド移行（Firebase → Neon + Hono）を機にテストを導入する。Testing Trophy（Kent C. Dodds提唱）ベースで、統合テストを中心に据えた実践的な戦略をとる。

## Testing Trophy

```
        ▲ E2E          ← 少数・重要フローだけ
       ▲▲▲ 統合テスト    ← ここが一番厚い（中心）
      ▲▲▲▲▲ 単体テスト   ← ロジックだけ
     ▲▲▲▲▲▲▲ 静的テスト  ← TypeScript + ESLint
```

原則: **ユーザーの実際の操作に近いテストほど価値が高い**

## ツールスタック

| 用途                 | ツール                                        |
| -------------------- | --------------------------------------------- |
| テストランナー       | **Vitest**（Jestより高速、TypeScript native） |
| コンポーネントテスト | **React Testing Library**                     |
| APIモック            | **MSW (Mock Service Worker)**                 |
| a11y自動チェック     | **axe-core + jest-axe**                       |
| ビジュアル回帰       | **Storybook**                                 |
| E2E                  | **Playwright**                                |
| API統合テスト        | **Vitest + Hono `app.request()`**             |

## パッケージ

```bash
# 単体・統合テスト（frontend）
vitest @vitest/ui happy-dom @testing-library/react @testing-library/user-event

# APIモック（frontend）
msw

# a11y
axe-core jest-axe eslint-plugin-jsx-a11y

# ビジュアル回帰
storybook @chromatic-com/storybook  # Chromaticはオプション

# E2E
@playwright/test

# API統合テスト（backend）
vitest  # Hono の app.request() でテスト
```

---

## 各テスト層の詳細

### 1. 静的テスト（最優先・低コスト）

コード実行前に自動でキャッチできるレイヤー。

- **TypeScript strict mode**: 導入済み。型レベルでバグを防止
- **ESLint**: 導入済み。`jsx-a11y` プラグイン追加でa11y違反も自動検出
- **Drizzle スキーマ型**: DB スキーマから自動生成される型で、フロント〜バックエンド間の型安全性を確保

### 2. 単体テスト

個別の関数・フック・ストアのロジックをテスト。

**テスト対象:**

- ユーティリティ関数（タスクグルーピング、日付フォーマット等）
- API レスポンス ↔ フロント型の変換ロジック
- Zod バリデーション
- Zustand ストア
- カスタムフック（フィルタロジック、タイマー等）
- Drizzle スキーマ定義の整合性

**テストしないもの:**

- UIの見た目 → 統合テスト or ビジュアル回帰で
- API 呼び出し → MSW + 統合テストで

### 3. 統合テスト（中心・最高ROI）

複数のコンポーネント・フック・APIが連携する部分をテスト。ユーザー視点で書く。

**フロントエンド統合テスト:**

- TaskForm でタスク作成 → 成功メッセージ表示
- フィルタ適用 → テーブル更新
- TanStack Query のデータ取得 → UI 表示
- コメント投稿 → リスト更新

**バックエンド統合テスト（Hono）:**

Hono の `app.request()` を使い、HTTP レイヤーから API をテスト。テスト用の Neon ブランチ or Docker PostgreSQL に接続。

```typescript
// backend/src/routes/tasks.test.ts
import { app } from '../index';

describe('GET /api/tasks', () => {
  it('認証済みユーザーのタスク一覧を返す', async () => {
    const res = await app.request('/api/tasks', {
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toBeDefined();
  });
});
```

**テスト方針:**

- セマンティッククエリ優先: `getByRole()` > `getByLabelText()` > `getByTestId()`
- MSW で Hono API をモック → 実際のネットワーク層でインターセプト
- TanStack Query / Zustand はラッパーで本物の Provider を使う

### 4. a11yテスト

React Ariaを使っていても実装ミスはあり得る。自動チェックで網をかける。

**テスト対象:**

- 各コンポーネントのWCAG違反チェック（axe-core）
- ラベル・フォーカス管理の確認
- キーボード操作の動作確認

### 5. ビジュアル回帰テスト

スクリーンショット比較でUIの意図しない変更を検出。

**テスト対象:**

- 共有UIプリミティブ（Button, Dialog, Select等）
- Storybookでカタログ化 → Chromaticで差分検出（オプション）

### 6. E2Eテスト（選別的）

重要なユーザーフロー3〜5個のみ。

**テスト対象:**

- ログイン（Clerk 経由 Google OAuth）→ ダッシュボード表示
- タスクCRUD（作成・編集・削除）
- タイマー操作（開始・停止）

**テストしないもの:**

- 個別コンポーネントの機能 → 統合テストで
- UIの見た目 → Storybookで

### 7. API 認証・認可テスト

Hono の認証ミドルウェア（Clerk）が正しく動作するかをテスト。

**テスト対象:**

- 未認証リクエストの拒否（401 レスポンス）
- 認証済みユーザーのリソースアクセス制御
- Admin ロールの権限チェック
- 他ユーザーのリソースへのアクセス拒否

```typescript
// backend/src/middleware/auth.test.ts
describe('認証ミドルウェア', () => {
  it('トークンなしで 401 を返す', async () => {
    const res = await app.request('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('無効なトークンで 401 を返す', async () => {
    const res = await app.request('/api/tasks', {
      headers: { Authorization: 'Bearer invalid' },
    });
    expect(res.status).toBe(401);
  });
});
```

---

## テストでの認証モック

テストでは本物の Google 認証を通さず、認証を「モック」する。

| テスト種別               | 手法                                                 |
| ------------------------ | ---------------------------------------------------- |
| API テスト（Vitest）     | 認証ミドルウェアをモック（偽のユーザー情報をセット） |
| E2E テスト（Playwright） | Clerk Testing Token（認証済み状態を直接作成）        |
| コンポーネントテスト     | useAuth 等の hooks をモック                          |

---

## テスト用 DB 戦略

| 方式                    | メリット                                 | デメリット                        |
| ----------------------- | ---------------------------------------- | --------------------------------- |
| **Neon テストブランチ** | 本番スキーマと完全一致、セットアップ不要 | ネットワーク依存、オフライン不可  |
| **Docker PostgreSQL**   | オフライン可、高速、CI 向き              | Docker 必要、マイグレーション手動 |

推奨: **CI では Docker PostgreSQL、ローカル開発では Neon テストブランチ** のハイブリッド。

---

## 導入フェーズ

| フェーズ | 内容                                               | タイミング              |
| -------- | -------------------------------------------------- | ----------------------- |
| Phase 1  | Vitest セットアップ + ESLint jsx-a11y 追加         | 開発初期                |
| Phase 2  | API 統合テスト（Hono `app.request()`）+ 単体テスト | バックエンド実装と同時  |
| Phase 3  | フロント統合テスト（MSW + RTL）                    | フロント実装と同時      |
| Phase 4  | a11y テスト（axe-core）+ Storybook                 | UI コンポーネント完成後 |
| Phase 5  | E2E テスト（Playwright）+ CI/CD 統合               | 主要機能完成後          |

---

## CI/CD統合

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: cd frontend && bun install
      - run: cd frontend && bun run lint
      - run: cd frontend && bun run test
      - run: cd frontend && bun run test:coverage

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: chumo_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: cd backend && bun install
      - run: cd backend && npx drizzle-kit migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/chumo_test
      - run: cd backend && bun run test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/chumo_test
```

## npm scripts

```json
// frontend/package.json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:e2e": "playwright test"
}

// backend/package.json
{
  "test": "vitest",
  "test:coverage": "vitest --coverage"
}
```
