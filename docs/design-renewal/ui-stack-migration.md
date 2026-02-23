# UIスタック移行プラン（MUI → Tailwind + React Aria）

## Context

MUIを使用していたことでデザインの自由度が制限されていたため、UIを刷新する。Pencilで作成したデザインシステムとの親和性・運用しやすさを考慮し、Tailwind CSS + CSS Modules + React Aria Components に移行する。

## 新スタック

| 種別         | 選定                           | 理由                                                 |
| ------------ | ------------------------------ | ---------------------------------------------------- |
| スタイリング | **Tailwind CSS + CSS Modules** | Pencilとの相性◎、運用しやすい                        |
| ヘッドレスUI | **React Aria Components**      | a11y最強、コンポーネント網羅率高、DatePicker/DnD内蔵 |
| アイコン     | **Lucide React**               | Pencilと統一、軽量、Tree-shakable                    |
| トースト     | **React Aria (Toast)**         | React Aria内蔵で追加不要                             |
| CSSリセット  | **Tailwind Preflight**         | Tailwind内蔵、MUI CssBaselineの代替                  |

## 削除するパッケージ

- `@mui/material`
- `@mui/icons-material`
- `@emotion/react`
- `@emotion/styled`

## 追加するパッケージ

- `tailwindcss` + `@tailwindcss/postcss`
- `react-aria-components`
- `lucide-react`
- `framer-motion`

## 現状のMUI依存度（移行対象）

| 項目                      | 数値       |
| ------------------------- | ---------- |
| MUI使用ファイル           | 47ファイル |
| `sx` prop使用箇所         | 約368箇所  |
| ユニークMUIコンポーネント | 約50種類   |
| MUIアイコン               | 27個       |

---

## AI開発ツール導入

### React Aria MCP Server

React Ariaの公式MCPサーバーを導入し、開発時にAPIドキュメント・使い方をリアルタイム参照可能にする。

```bash
claude mcp add react-aria npx @react-aria/mcp@latest
```

### React Aria Agent Skills

AIツール向けのインストラクション・リソースを導入。

```bash
npx skills add https://react-aria.adobe.com
```

---

## MUIコンポーネント → 移行先マッピング

### レイアウト系

| MUI       | 移行先                              |
| --------- | ----------------------------------- |
| Box       | `<div>` + Tailwind classes          |
| Container | `<div className="mx-auto max-w-*">` |
| Grid      | CSS Grid / Flexbox + Tailwind       |
| Drawer    | React Aria `Dialog` (modal/slide)   |

### 入力フォーム系

| MUI                      | 移行先                               |
| ------------------------ | ------------------------------------ |
| TextField                | `<input>` / React Aria `TextField`   |
| Select + MenuItem        | React Aria `Select` / `ListBox`      |
| FormControl + InputLabel | React Aria `Label` + `Input`         |
| Checkbox                 | React Aria `Checkbox`                |
| Radio / RadioGroup       | React Aria `RadioGroup`              |
| OutlinedInput            | React Aria `Input` + Tailwind border |

### データ表示系

| MUI             | 移行先                                         |
| --------------- | ---------------------------------------------- |
| Typography      | セマンティックHTML (`<h1>`〜`<p>`) + Tailwind  |
| Table系         | HTML `<table>` + Tailwind / React Aria `Table` |
| Chip            | 自作コンポーネント + Tailwind                  |
| Avatar          | 自作コンポーネント + Tailwind                  |
| Paper / Card    | `<div>` + Tailwind shadow/bg                   |
| List / ListItem | HTML `<ul>/<li>` + Tailwind                    |

### フィードバック系

| MUI              | 移行先                                  |
| ---------------- | --------------------------------------- |
| Dialog           | React Aria `Dialog` + `Modal`           |
| Alert            | 自作コンポーネント + Tailwind           |
| Snackbar         | React Aria `Toast`                      |
| CircularProgress | CSS animation + Tailwind `animate-spin` |
| LinearProgress   | 自作コンポーネント + Tailwind           |

### ナビゲーション系

| MUI              | 移行先                      |
| ---------------- | --------------------------- |
| AppBar + Toolbar | `<header>/<nav>` + Tailwind |
| Tabs             | React Aria `Tabs`           |
| Accordion        | React Aria `Disclosure`     |
| Menu             | React Aria `Menu`           |
| Tooltip          | React Aria `Tooltip`        |
| ToggleButton     | React Aria `ToggleButton`   |

### ボタン・操作系

| MUI        | 移行先                             |
| ---------- | ---------------------------------- |
| Button     | React Aria `Button` + Tailwind     |
| IconButton | React Aria `Button` + Lucide icon  |
| Link       | React Aria `Link` / Next.js `Link` |

### アイコン（27個）

| MUI Icon            | Lucide 対応     |
| ------------------- | --------------- |
| Edit                | `Pencil`        |
| Delete              | `Trash2`        |
| Check               | `Check`         |
| Close               | `X`             |
| Send                | `Send`          |
| Comment             | `MessageSquare` |
| Notifications       | `Bell`          |
| NotificationsOff    | `BellOff`       |
| CloudUpload         | `CloudUpload`   |
| Image               | `Image`         |
| CheckCircle         | `CheckCircle`   |
| FolderOpen          | `FolderOpen`    |
| LocalFireDepartment | `Flame`         |
| ChatBubbleOutline   | `MessageCircle` |
| BugReport           | `Bug`           |
| PlayArrow           | `Play`          |
| Stop                | `Square`        |
| Search              | `Search`        |
| ExpandMore          | `ChevronDown`   |
| Person              | `User`          |
| PersonOff           | `UserX`         |
| CalendarToday       | `Calendar`      |
| DragIndicator       | `GripVertical`  |
| GridView            | `LayoutGrid`    |
| TableRows           | `Rows3`         |
| ViewKanban          | `Columns3`      |
| Palette             | `Palette`       |

---

## デザイントークン連携

Pencilで定義した変数（91個）→ CSS custom properties → Tailwind config のフロー:

```css
/* globals.css */
:root {
  --color-primary: #008b8a;
  --color-text-primary: ...;
  --spacing-md: 12px;
  --font-size-md: 16px;
  /* ... */
}
```

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        // ...
      },
      spacing: {
        md: 'var(--spacing-md)',
        // ...
      },
    },
  },
};
```

---

## Next.js 設定変更

- `next.config.js` から `compiler: { emotion: true }` を削除
- Tailwind用の `postcss` 設定を追加
- `app/globals.css` にTailwindディレクティブ + CSS変数定義

---

## コンポーネントディレクトリ構成

**方針: Hybrid + コロケーション**（shadcn/ui・Vercel公式テンプレート等で採用されている現行トレンド）

```
app/
├── (auth)/
│   ├── login/
│   │   ├── page.tsx
│   │   └── _components/           # ログイン専用
│   └── ...
│
└── (dashboard)/
    ├── layout.tsx
    ├── _components/                # ダッシュボード共通（Header, Sidebar）
    ├── dashboard/
    │   ├── page.tsx
    │   └── _components/            # ダッシュボード専用
    ├── tasks/
    │   ├── page.tsx
    │   ├── [id]/page.tsx
    │   └── _components/            # タスク専用（TaskTable, TaskCard, TaskFilter...）
    ├── reports/
    │   ├── page.tsx
    │   └── _components/
    ├── contacts/
    │   ├── page.tsx
    │   └── _components/
    └── settings/
        ├── page.tsx
        └── _components/

components/
├── ui/                             # React Aria ラップの共有UIプリミティブ
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── select.tsx
│   ├── tabs.tsx
│   ├── badge.tsx
│   └── ...
└── shared/                         # 複数フィーチャーで使うもの
    ├── EmptyState.tsx
    ├── LoadingSpinner.tsx
    └── ...

lib/
├── hooks/                          # 共有カスタムフック
├── utils/                          # cn(), date-format等
└── api/                            # API関連

types/                              # 型定義
```

**ルール:**

- `_components/` はApp Routerでルートとして認識されない（`_`接頭辞）
- ページ専用コンポーネントは該当ページの `_components/` に配置
- 複数フィーチャーで使う場合のみ `components/shared/` に昇格
- `components/ui/` は React Aria ラッパーの共有UIプリミティブ
- Tailwind 80% + CSS Modules 20%（複雑なスタイルのみCSS Modules）

---

## その他の決定事項

- **DnD**: React Ariaの `useDrag`/`useDrop` に統合、`@dnd-kit` は削除（※ 各機能仕様書では現行の `@dnd-kit` ベースで記述。DnD移行はUI刷新フェーズで一括対応）
- **アニメーション**: `framer-motion` を使用
- **フォント**: Pencilデザインに準拠
- **ダークモード**: CSS変数設計時点で対応完了する想定
- **移行アプローチ**: ステージング環境で丸ごと作り直し

---

## 注意点

- **アクセシビリティ**: React Ariaがカバー。自作コンポーネント（Chip, Badge, Avatar等）は手動でARIA対応
- **ダークモード**: Tailwind `dark:` バリアント + CSS変数の切替で対応可能
