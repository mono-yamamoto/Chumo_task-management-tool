# Pencil MCP 操作ナレッジ

Chumoプロジェクトで蓄積したPencil MCP操作の実践的なTips。
Phase 4（Design）で参照する。

---

## 基本

- `.pen` ファイルは暗号化されている → Read/Grep ではなく必ず Pencil MCP ツール経由
- `batch_design` は1回最大25オペレーション
- 作業中は `placeholder: true`、完了時に `false`
- ファイル間でのコンポーネント参照（ref）はできない

---

## batch_design オペレーション

### Insert: I()

```javascript
frame = I('parentId', {
  type: 'frame',
  name: 'ComponentName',
  layout: 'vertical',
  gap: 16,
  padding: [16, 16, 16, 16],
  width: 360,
  height: 240,
  fill: '$--color-bg-primary',
  cornerRadius: [8, 8, 8, 8],
});
```

- **children渡せる**: ドキュメントは「single node only」と書いてあるが、実際にはchildren配列を含むフレーム挿入が動作する
- ネストした構造を1オペで作成可能

### Copy: C()

```javascript
copy = C('sourceId', 'parentId', { name: 'CopiedComponent' });
```

- コピー後は全子ノードに新IDが振られる → `batch_get` で確認必要
- ダッシュボードコピー戦略: C()で全体コピー → 不要部分削除 → 新規要素追加が効率的

### Update: U()

```javascript
U('nodeId', { fill: '$--teal-600', fontSize: '$--font-size-md' });
```

- `null` を渡すとエラー → 不要なプロパティは省略
- 変数バインドは必ず `U()` で設定する

### Delete: D()

```javascript
D('nodeId');
```

### Move: M()

```javascript
M('nodeId', 'newParentId', 2); // 2番目の位置に移動
```

### Generate Image: G()

```javascript
G('parentId', 'ai', 'description of the image');
```

---

## テキストノード

- **必須**: `textGrowth: "fixed-width"` を付ける（列幅が固定されず崩れる）
- 折り返し: `width: "fill_container"` だけでは効かない → `textGrowth: "fixed-width"` + 明示的な `width` を設定
- フォント関連の変数参照:
  - `fontSize: "$--font-size-md"`
  - `fontWeight: "$--font-weight-bold"`
  - `lineHeight: "$--line-height-normal"`
  - `fill: "$--color-text-primary"`

---

## 変数参照

### 基本構文

fill/stroke/fontSize等で `"$--variable-name"` 形式で参照:

```javascript
{
  fill: "$--teal-600",
  fontSize: "$--font-size-md",
  padding: ["$--spacing-md", "$--spacing-lg"]
}
```

- padding配列でも変数参照可能

### 変数バインドの注意

- `replace_all_matching_properties` は `$--var` を文字列として保存するだけで変数バインドされない（描画されない）
- 変数参照は必ず `batch_design` の `U()` で設定すること

### 変数定義

`set_variables` で `{name: {value, type}}` 形式:

```javascript
mcp__pencil__set_variables({
  variables: {
    '--new-color': { value: '#FF0000', type: 'color' },
    '--new-spacing': { value: '24', type: 'number' },
  },
});
```

- fontWeight は **string型** で定義（value: "700", type: "string"）。number型だと型不一致エラー
- in-place型変更はできない → `replace: true` で全変数を再定義が必要

---

## レイアウト

### justifyContent

- **アンダースコア**: `"space_between"` が正しい
- `"space-between"` はサイレントに無視される

### グリッドレイアウト

- `layout: "none"` のコンポーネントは絶対座標（x/y）で配置
- 再構築する場合は必ず元の座標を保存してから作業

---

## batch_get

- `nodeIds` はJSON配列ではなくカンマ区切り文字列: `"id1,id2,id3"`
- パターン検索も可能: `patterns: ["type=frame,name=Button*"]`

---

## テーマ・ダークモード

- `set_variables` の `themes` パラメータは現時点で正しく動作しない（2026-02時点）
- ダークモードはプリミティブ変数参照でドキュメント内に別フレームとして管理
- Light/Dark両方作る場合: Lightを先に作成 → C()でコピー → 変数参照を差し替え

---

## 既存デザインシステム（designs/design.pen）

### 変数: 91個定義済み

- プリミティブカラー63: teal×11, neutral×11, red×10, green×10, blue×10, amber×10, white×1
- セマンティック24: bg, text, border, success, error, warning等
- spacing 7: xs(4), sm(8), md(12), lg(16), xl(24), 2xl(32), 3xl(48)
- fontSize 7: xs(12), sm(14), md(16), lg(18), xl(20), 2xl(24), 3xl(32)
- lineHeight 4: tight(1.25), normal(1.5), relaxed(1.625), loose(2)
- fontWeight 3: regular("normal"), medium("500"), bold("700")
- radius 6: xs(2), sm(4), md(6), lg(8), xl(12), 2xl(16)

### 新規変数追加のルール

- 闇雲に追加しない。既存の最も近い変数にマップするのが原則
- 新規が本当に必要な場合はユーザーに確認してから追加

---

## 効率的な作業フロー

1. `get_editor_state()` でエディタ確認
2. `open_document()` でファイルを開く
3. `find_empty_space_on_canvas()` で配置場所を確認
4. `batch_design` でフレーム構築（placeholder: true）
5. `get_screenshot()` で途中確認
6. 修正があれば `U()` / `D()` / `I()` で調整
7. 完了したら `placeholder: false` を設定
8. 最終 `get_screenshot()` で確認
