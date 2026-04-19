---
name: design-to-code-verify
description: |
  Pencilデザインからコード実装し、数値レベルで検証するワークフロー。
  デザイン仕様値 → CSSトークン → computed styleの3点突き合わせで精度を担保する。
  使用タイミング:
  - 新しいページ/コンポーネントをPencilデザインから実装する時
  - 実装がデザインと一致しているか検証する時
  - デザインとの差分を特定・修正する時
  Keywords: デザイン実装, Pencil実装, デザイン検証, スタイル確認, design verify
---

Pencilデザインからコード実装し、数値レベルで検証するスキル。

## 核心原則

検証は **3点突き合わせ** で行う:

```
Pencil batch_get（デザイン仕様値）
  ↓ マッピング
index.css デザイントークン（CSS変数）
  ↓ 適用
Chrome DevTools computed style（実際のレンダリング値）
```

3つが一致して初めて「デザイン通り」と判定する。
**スクリーンショットの見た目比較だけでは判定しない。**

## Step 1: デザイン仕様値の取得

`mcp__pencil__batch_get` で対象ノードのプロパティを数値で取得する。

```
mcp__pencil__batch_get({
  nodeIds: ["対象ノードID"],
  readDepth: 2〜3,
  resolveVariables: true   // 変数を実値に解決
})
```

取得すべきプロパティ:

- **レイアウト**: layout, gap, padding, justifyContent, alignItems
- **サイズ**: height, width
- **見た目**: cornerRadius, fill, stroke, opacity
- **テキスト**: fontSize, fontWeight, lineHeight, fill(色)
- **構造**: children の階層構造

**注意**: Pencil MCPが不安定な場合は `open_document` で再度ファイルを開き直す。

## Step 2: デザイントークンへのマッピング

取得した数値を **`frontend/src/index.css`** の `@theme` 定義と照合し、対応するTailwindクラスを特定する。

**マッピングテーブルをこのスキルに直書きしない。** 必ず `frontend/src/index.css` を読んで最新の定義を確認すること。
トークン値は更新される可能性があるため、実装のたびにソースを参照する。

### マッピング手順

1. `frontend/src/index.css` を読み、`@theme` ブロック内のトークン定義を確認する
2. Pencilから取得した数値（例: `cornerRadius: 8`）に一致するトークンを探す（例: `--radius-md: 8px`）
3. トークン名からTailwindクラスを導出する（例: `--radius-md` → `rounded-md`）

### Tailwindクラスの導出ルール

`@theme` で定義された CSS 変数はTailwindクラスに以下のように対応する:

| CSS変数のプレフィックス | Tailwindクラスのプレフィックス | 例                                                          |
| ----------------------- | ------------------------------ | ----------------------------------------------------------- |
| `--radius-*`            | `rounded-*`                    | `--radius-md: 8px` → `rounded-md`                           |
| `--color-bg-*`          | `bg-bg-*`                      | `--color-bg-primary: #fff` → `bg-bg-primary`                |
| `--color-text-*`        | `text-text-*`                  | `--color-text-secondary: #6B7280` → `text-text-secondary`   |
| `--color-border-*`      | `border-border-*`              | `--color-border-default: #E5E7EB` → `border-border-default` |
| `--color-primary-*`     | `bg-primary-*`                 | `--color-primary-default: #008B8A` → `bg-primary-default`   |
| `--color-error-*`       | `bg-error-*` / `text-error-*`  | 接尾辞 `-bg` なら bg、`-text` なら text                     |
| `--text-*`              | `text-*` (fontSize)            | `--text-sm: 0.875rem` → `text-sm`                           |
| `--leading-*`           | `leading-*`                    | `--leading-normal: 1.5` → `leading-normal`                  |
| `--font-weight-*`       | `font-*`                       | `--font-weight-bold: 700` → `font-bold`                     |

### Spacing（padding/gap）の対応

Tailwind v4 では spacing は `--spacing` ベーステーマ値の倍数で算出される。
`frontend/src/index.css` の `--spacing-*` カスタムトークンと、Tailwind標準の数値クラス（`p-5` = 20px 等）の両方を把握すること。

**迷ったら `frontend/src/index.css` を開いて確認する。推測しない。**

## Step 3: 実装

Step 2のマッピング結果に基づいてTailwindクラスを適用する。推測しない。

## Step 4: computed style で検証

`mcp__chrome-devtools__evaluate_script` でレンダリング後の実値を取得する。

```javascript
() => {
  const el = document.querySelector('.your-selector');
  const cs = window.getComputedStyle(el);
  return {
    padding: cs.padding,
    borderRadius: cs.borderRadius,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight,
    height: cs.height,
    backgroundColor: cs.backgroundColor,
    color: cs.color,
    gap: cs.gap,
    borderColor: cs.borderColor,
  };
};
```

**複数要素を一度に検証する**こと。1要素ずつ個別にスクリプトを実行しない。

## Step 5: 突き合わせテーブル作成

要素ごとに比較テーブルを作り、Pass/Failを判定する。

```
| 要素 | プロパティ | デザイン仕様 | computed style | 判定 |
|------|----------|------------|---------------|------|
| Card | borderRadius | 12px | 12px | ✓ |
| Card | padding | 20px | 20px | ✓ |
| Input | height | 40px | 36px | ✗ |
```

Failがあれば Step 2 に戻ってマッピングを見直し、修正後に再度 Step 4-5 を実行する。

## アンチパターン（禁止事項）

- **スクリーンショットの目視比較だけで「一致」と判断しない**
- **デザイントークンのマッピングを確認せずにTailwindクラスを推測しない**
  - 例: cornerRadius 8px を `rounded-lg`(12px) と思い込まない → 必ず `rounded-md`(8px) を確認
- **既存UIコンポーネントのスタイルを無条件にコピーしない**
  - 例: 既存Inputが `bg-bg-secondary` でも、デザインが `fill: #FFFFFF` なら `bg-bg-primary` を使う
- **computed style 検証をスキップしない**
- **1つの要素だけ確認して「全部OK」と判断しない** — 全要素を検証する
