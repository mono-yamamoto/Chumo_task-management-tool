# テスト戦略

## Context

UIリニューアルを機にテストを導入する。Testing Trophy（Kent C. Dodds提唱）ベースで、統合テストを中心に据えた実践的な戦略をとる。

## Testing Trophy

```
        ▲ E2E          ← 少数・重要フローだけ
       ▲▲▲ 統合テスト    ← ここが一番厚い（中心）
      ▲▲▲▲▲ 単体テスト   ← ロジックだけ
     ▲▲▲▲▲▲▲ 静的テスト  ← TypeScript + ESLint
```

原則: **ユーザーの実際の操作に近いテストほど価値が高い**

## ツールスタック

| 用途                 | ツール                                               |
| -------------------- | ---------------------------------------------------- |
| テストランナー       | **Vitest**（Jestより高速、TypeScript native）        |
| コンポーネントテスト | **React Testing Library**                            |
| APIモック            | **MSW (Mock Service Worker)**                        |
| a11y自動チェック     | **axe-core + jest-axe**                              |
| ビジュアル回帰       | **Storybook**                                        |
| E2E                  | **Playwright**                                       |
| Firestoreルール      | **Firebase Emulator + @firebase/rules-unit-testing** |

## パッケージ

```bash
# 単体・統合テスト
vitest @vitest/ui happy-dom @testing-library/react @testing-library/user-event

# APIモック
msw

# a11y
axe-core jest-axe eslint-plugin-jsx-a11y

# ビジュアル回帰
storybook @chromatic-com/storybook  # Chromaticはオプション

# E2E
@playwright/test

# Firestoreルール
@firebase/rules-unit-testing
```

---

## 各テスト層の詳細

### 1. 静的テスト（最優先・低コスト）

コード実行前に自動でキャッチできるレイヤー。

- **TypeScript strict mode**: 導入済み。型レベルでバグを防止
- **ESLint**: 導入済み。`jsx-a11y` プラグイン追加でa11y違反も自動検出

### 2. 単体テスト

個別の関数・フック・ストアのロジックをテスト。

**テスト対象:**

- ユーティリティ関数（タスクグルーピング、日付フォーマット等）
- Firestore ↔ DTO変換（mappers）
- Zodバリデーション
- Zustandストア
- カスタムフック（フィルタロジック、タイマー等）

**テストしないもの:**

- UIの見た目 → 統合テスト or ビジュアル回帰で
- Firebase呼び出し → MSW + 統合テストで

### 3. 統合テスト（中心・最高ROI）

複数のコンポーネント・フック・APIが連携する部分をテスト。ユーザー視点で書く。

**テスト対象:**

- TaskFormでタスク作成 → 成功メッセージ表示
- フィルタ適用 → テーブル更新
- React Queryのデータ取得 → UI表示
- コメント投稿 → リスト更新

**テスト方針:**

- セマンティッククエリ優先: `getByRole()` > `getByLabelText()` > `getByTestId()`
- MSWでAPIをモック → 実際のネットワーク層でインターセプト
- React Query / Zustand はラッパーで本物のProviderを使う

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

- ログイン → ダッシュボード表示
- タスクCRUD（作成・編集・削除）
- タイマー操作（開始・停止）

**テストしないもの:**

- 個別コンポーネントの機能 → 統合テストで
- UIの見た目 → Storybookで

### 7. Firestoreセキュリティルールテスト

Firebase Emulatorを使ってルールの正当性を検証。

**テスト対象:**

- 認証済みユーザーのみアクセス可能か
- 自分のドキュメントのみ書き込み可能か
- Adminロールの権限チェック

---

## 導入フェーズ

| フェーズ | 内容                                      | タイミング             |
| -------- | ----------------------------------------- | ---------------------- |
| Phase 1  | Vitest セットアップ + ESLint jsx-a11y追加 | 開発初期               |
| Phase 2  | 統合テスト（MSW + RTL）+ 単体テスト       | 機能実装と同時         |
| Phase 3  | a11yテスト（axe-core）+ Storybook         | UIコンポーネント完成後 |
| Phase 4  | E2Eテスト（Playwright）+ CI/CD統合        | 主要機能完成後         |

---

## CI/CD統合

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run test
      - run: bun run test:coverage
```

## npm scripts

```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:e2e": "playwright test"
}
```
