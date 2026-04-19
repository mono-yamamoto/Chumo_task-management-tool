# design-review

PencilデザインとPlaywright CLIスクリーンショットを比較して、実装をデザインに一致させるための反復修正ワークフロー。

## When to use

- ユーザーが「デザインと比較して」「デザインに合わせて」「見た目を直して」と言った時
- 新しいコンポーネントやページのデザイン検証時
- デザインレビュー/QA時

## Workflow

### Step 1: デザインスクリーンショット取得

Pencil MCPの `get_screenshot` ツールでデザインファイルのノードIDを指定してスクリーンショットを取得する。

- デザインファイルパス: `designs/design.pen`
- ノードIDはMEMORY.mdまたは `batch_get` で特定
- reusableコンポーネントのIDはプロジェクトメモリに記録済み

### Step 2: 実装スクリーンショット取得

**必ずPlaywright CLIを使う**（Chrome DevTools MCPではない）。

```bash
# サイドバー単体
npx playwright screenshot --viewport-size="240,900" http://localhost:5173/PATH /tmp/COMPONENT-vN.png

# フルページ
npx playwright screenshot --viewport-size="1440,900" http://localhost:5173/PATH /tmp/PAGE-vN.png

# ドロワー（480px幅 = ドロワー幅で要素だけ表示）
npx playwright screenshot --viewport-size="480,1100" --wait-for-timeout=1000 "http://localhost:5173/dashboard?task=task-1" /tmp/drawer-vN.png

# アニメーション待ち
npx playwright screenshot --wait-for-timeout=1000 --viewport-size="1440,900" URL /tmp/OUTPUT.png
```

### Step 3: 差分分析

両方のスクリーンショットを `Read` ツールで開いて視覚比較する。

**チェック項目:**

- レイアウト構造（flex方向、配置、gap）
- カラー（背景、テキスト、ボーダー、アイコン）
- フォント（サイズ、ウェイト、行間）
- スペーシング（padding、margin、gap）
- 角丸（radius）
- ボーダー（太さ、色、位置）
- アイコン（種類、サイズ、色）
- コンポーネント固有（バッジ、アバター、トグル等）

### Step 4: デザイン詳細取得

差分が見つかったら `batch_get` でノードの詳細プロパティを取得する。

```
mcp__pencil__batch_get({
  filePath: "designs/design.pen",
  nodeIds: ["NODE_ID"],
  readDepth: 3
})
```

- `readDepth: 3` で子要素の構造も確認
- `resolveVariables: true` で変数の実際の値も確認可能
- `patterns` で名前検索も可能: `[{"name": "Header|Toolbar"}]`

### Step 5: 実装修正

Tailwindクラスをデザイントークンに合わせて修正する。

**トークンマッピング:**

- セマンティック: `bg-bg-primary`, `text-text-secondary`, `border-border-default`
- プリミティブ: `bg-teal-600`, `text-neutral-400`
- ステータス: `bg-error-bg`, `text-warning-text`, `bg-success-bg`

**Pencil→Tailwind変換例:**
| Pencil | Tailwind |
|--------|----------|
| `fill: "$--color-text-primary"` | `text-text-primary` |
| `fill: "$--color-bg-secondary"` | `bg-bg-secondary` |
| `cornerRadius: "$--radius-md"` | `rounded-md` |
| `fontSize: "$--font-size-sm"` | `text-sm` |
| `fontWeight: "$--font-weight-bold"` | `font-bold` |
| `gap: 8` | `gap-2` |
| `padding: [10, 16]` | `px-4 py-2.5` |
| `padding: 12` | `p-3` |
| `height: 40` | `h-10` |
| `width: "fill_container"` | `w-full` / `flex-1` |
| `justifyContent: "space_between"` | `justify-between` |
| `layout: "vertical"` | `flex flex-col` |
| `stroke: {thickness: {bottom: 1}}` | `border-b border-border-default` |
| `stroke: {thickness: {left: 3}}` | `border-l-[3px] border-l-ERROR_COLOR` |

### Step 6: 型チェック

```bash
npx tsc --noEmit
```

### Step 7: 再スクショ → Step 3に戻る

- 修正後にPlaywright CLIで再スクリーンショット
- デザインと再比較
- 差分がなくなるまで繰り返す（通常2〜4イテレーション）

## Important notes

- **Chrome DevTools MCPではなく、必ずPlaywright CLIを使う**
- `.pen`ファイルは暗号化 → Read/Grepではなく必ずPencil MCPツール経由
- dev serverが起動していない場合: `npx vite --port 5173 &disown`
- Pencilノードの主要IDはMEMORY.mdに記録済み
- デザイントークンは `frontend/src/index.css` の `@theme` ブロックで定義
- ダークモード: `.dark` クラスでCSS変数オーバーライド
- Pencil変数参照: `$--variable-name` 形式

## Design file reference

| コンポーネント            | ノードID |
| ------------------------- | -------- |
| Dashboard Light           | `wGdx6`  |
| Side Menu (reusable)      | `1jZQ4`  |
| Side Menu Dark            | `yw6wW`  |
| Task Drawer Light         | `v8BBk`  |
| Task Drawer Dark          | `oerwx`  |
| Task Drawer Comment Light | `58DXP`  |
| Task Drawer Comment Dark  | `sSZeN`  |
| Table Header Light        | `VuRiA`  |
| Table Header Dark         | `VBUXj`  |
| Row - Normal Light        | `hgZUq`  |
| Row - Error Light         | `4pl5P`  |
| Row - Warning Light       | `QMu0M`  |

その他のIDはMEMORY.mdを参照。
