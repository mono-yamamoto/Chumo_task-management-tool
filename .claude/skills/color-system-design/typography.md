# Chumo タイポグラフィ設定

## Font Face

```css
font-family: 'Plus Jakarta Sans', 'Noto Sans JP', sans-serif;
```

- **Plus Jakarta Sans**: ラテン文字（英数字）。Google Fonts無料。モダンなジオメトリックサンセリフ。
- **Noto Sans JP**: 日本語フォールバック。Google Fonts無料。

## Font Weight

| weight | semantics | Usage                  |
| ------ | --------- | ---------------------- |
| 400    | Regular   | 本文テキスト           |
| 500    | Medium    | ラベル、強調テキスト   |
| 700    | Bold      | 見出し、ボタンテキスト |

## Font Size

| px   | rem       | semantics | Usage                      |
| ---- | --------- | --------- | -------------------------- |
| 11px | 0.6875rem | xs        | キャプション、注釈         |
| 12px | 0.75rem   | sm        | ラベル、補助テキスト       |
| 14px | 0.875rem  | md        | 本文テキスト（デフォルト） |
| 16px | 1rem      | lg        | 大きめの本文               |
| 18px | 1.125rem  | xl        | 小見出し                   |
| 24px | 1.5rem    | 2xl       | 中見出し                   |
| 32px | 2rem      | 3xl       | 大見出し                   |

## Line Height

| value | semantics | Usage                                  |
| ----- | --------- | -------------------------------------- |
| 1.25  | tight     | 見出し、大きいテキスト                 |
| 1.5   | normal    | 本文テキスト（デフォルト）             |
| 1.75  | relaxed   | 日本語の長文、説明テキスト             |
| 2.0   | loose     | 注釈、補足テキストで広めに取りたい場合 |

## Semantic Type Settings

UIの用途に基づくタイポグラフィの組み合わせ定義。

### Heading (Bold/700, tight/1.25)

| semantics  | size       | 用途       |
| ---------- | ---------- | ---------- |
| heading-xs | xs (11px)  | 最小見出し |
| heading-sm | sm (12px)  | 小見出し   |
| heading-md | md (14px)  | 標準見出し |
| heading-lg | xl (18px)  | 大見出し   |
| heading-xl | 2xl (24px) | 最大見出し |

### Body (Regular/400)

バリアント: default(normal/1.5) / narrow(relaxed/1.75) / tight(tight/1.25)

| semantics | size      | 用途               |
| --------- | --------- | ------------------ |
| body-sm   | sm (12px) | 補助テキスト       |
| body-md   | md (14px) | 本文（デフォルト） |
| body-lg   | lg (16px) | 大きめの本文       |

### Note (Regular/400)

バリアント: default(normal/1.5) / narrow(relaxed/1.75) / tight(tight/1.25)

| semantics | size      | 用途               |
| --------- | --------- | ------------------ |
| note-sm   | xs (11px) | 小さい注釈         |
| note-md   | sm (12px) | 注釈、キャプション |
| note-lg   | md (14px) | 大きめの注釈       |

### Button (Medium/500, tight/1.25)

| semantics | size      | 用途       |
| --------- | --------- | ---------- |
| button-sm | xs (11px) | 小ボタン   |
| button-md | md (14px) | 標準ボタン |
| button-lg | lg (16px) | 大ボタン   |

### Tag (Medium/500, tight/1.25)

| semantics | size      | 用途           |
| --------- | --------- | -------------- |
| tag-sm    | xs (11px) | 小タグ、バッジ |
| tag-md    | sm (12px) | 標準タグ       |
| tag-lg    | md (14px) | 大タグ         |
