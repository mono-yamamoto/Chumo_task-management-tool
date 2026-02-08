# Chumo カラーパレット定義

ブランドカラー: **#008B8A**

## Brand / Teal

| Step | HEX         | コントラスト比(白背景) | 用途例                                  |
| ---- | ----------- | ---------------------- | --------------------------------------- |
| 50   | #EEFBFB     | -                      | 背景tint、hover                         |
| 100  | #C5F2F1     | -                      | 薄い背景                                |
| 200  | #8DE5E4     | -                      | ボーダー（ライトモード）                |
| 300  | #55D5D4     | -                      | -                                       |
| 400  | #27C2C1     | -                      | ダークモードのプライマリ                |
| 500  | #00A8A7     | ~3.2:1                 | UI要素（3:1クリア）                     |
| 600  | **#008B8A** | **~4.1:1**             | **ブランドカラー** ボタン背景、大きいUI |
| 700  | #007170     | ~4.7:1 ✓               | テキスト用（4.5:1クリア）               |
| 800  | #005857     | ~7.1:1 ✓               | 強調テキスト                            |
| 900  | #003F3E     | -                      | -                                       |
| 950  | #002625     | -                      | -                                       |

## Neutral / Gray

| Step | HEX     | 用途例               |
| ---- | ------- | -------------------- |
| 50   | #F9FAFB | ページ背景（ライト） |
| 100  | #F3F4F6 | カード背景（ライト） |
| 200  | #E5E7EB | ボーダー（ライト）   |
| 300  | #D1D5DB | 無効テキスト         |
| 400  | #9CA3AF | プレースホルダー     |
| 500  | #6B7280 | セカンダリテキスト   |
| 600  | #4B5563 | ボーダー（ダーク）   |
| 700  | #374151 | カード背景（ダーク） |
| 800  | #1F2937 | ページ背景（ダーク） |
| 900  | #111827 | テキスト（ライト）   |
| 950  | #030712 | 最も暗い             |

## Status Colors

### Success (Green)

| Step | HEX     |
| ---- | ------- |
| 50   | #F0FDF4 |
| 100  | #DCFCE7 |
| 200  | #BBF7D0 |
| 300  | #86EFAC |
| 400  | #4ADE80 |
| 500  | #22C55E |
| 600  | #16A34A |
| 700  | #15803D |
| 800  | #166534 |
| 900  | #14532D |

### Warning (Amber)

| Step | HEX     |
| ---- | ------- |
| 50   | #FFFBEB |
| 100  | #FEF3C7 |
| 200  | #FDE68A |
| 300  | #FCD34D |
| 400  | #FBBF24 |
| 500  | #F59E0B |
| 600  | #D97706 |
| 700  | #B45309 |
| 800  | #92400E |
| 900  | #78350F |

### Error (Red)

| Step | HEX     |
| ---- | ------- |
| 50   | #FEF2F2 |
| 100  | #FEE2E2 |
| 200  | #FECACA |
| 300  | #FCA5A5 |
| 400  | #F87171 |
| 500  | #EF4444 |
| 600  | #DC2626 |
| 700  | #B91C1C |
| 800  | #991B1B |
| 900  | #7F1D1D |

### Info (Blue)

| Step | HEX     |
| ---- | ------- |
| 50   | #EFF6FF |
| 100  | #DBEAFE |
| 200  | #BFDBFE |
| 300  | #93C5FD |
| 400  | #60A5FA |
| 500  | #3B82F6 |
| 600  | #2563EB |
| 700  | #1D4ED8 |
| 800  | #1E40AF |
| 900  | #1E3A8A |

## Semantic Color Tokens

プリミティブカラー → セマンティックトークンのマッピング。
テーマ切り替えはセマンティック層の参照先を変えるだけで実現。

### Text

| Token          | Variable                 | Light Mode      | Dark Mode       | 備考                |
| -------------- | ------------------------ | --------------- | --------------- | ------------------- |
| text-primary   | `--color-text-primary`   | `--neutral-900` | `--neutral-50`  | 本文テキスト        |
| text-secondary | `--color-text-secondary` | `--neutral-500` | `--neutral-400` | 補助テキスト        |
| text-tertiary  | `--color-text-tertiary`  | `--neutral-400` | `--neutral-500` | プレースホルダー等  |
| text-disabled  | `--color-text-disabled`  | `--neutral-300` | `--neutral-600` | 無効状態            |
| text-link      | `--color-text-link`      | `--teal-700`    | `--teal-400`    | リンク（4.5:1確保） |

### Background

| Token           | Variable                  | Light Mode      | Dark Mode       | 備考                   |
| --------------- | ------------------------- | --------------- | --------------- | ---------------------- |
| bg-primary      | `--color-bg-primary`      | `#FFFFFF`       | `--neutral-800` | ページ背景             |
| bg-secondary    | `--color-bg-secondary`    | `--neutral-50`  | `--neutral-700` | カード・セクション背景 |
| bg-tertiary     | `--color-bg-tertiary`     | `--neutral-100` | `--neutral-600` | ネスト背景             |
| bg-brand-subtle | `--color-bg-brand-subtle` | `--teal-50`     | `--teal-950`    | ブランドtint背景       |

### Border

| Token          | Variable                 | Light Mode      | Dark Mode       | 備考                    |
| -------------- | ------------------------ | --------------- | --------------- | ----------------------- |
| border-default | `--color-border-default` | `--neutral-200` | `--neutral-600` | 通常ボーダー（3:1確保） |
| border-strong  | `--color-border-strong`  | `--neutral-400` | `--neutral-400` | 強調ボーダー            |
| border-focus   | `--color-border-focus`   | `--teal-500`    | `--teal-400`    | フォーカスリング        |

### Primary (Brand/Action)

| Token           | Variable                  | Light Mode   | Dark Mode    | 備考                |
| --------------- | ------------------------- | ------------ | ------------ | ------------------- |
| primary-default | `--color-primary-default` | `--teal-600` | `--teal-400` | ボタン背景・CTA     |
| primary-hover   | `--color-primary-hover`   | `--teal-700` | `--teal-300` | ホバー状態          |
| primary-active  | `--color-primary-active`  | `--teal-800` | `--teal-500` | アクティブ/押下状態 |

### Status

| Token        | Variable               | Light Mode    | Dark Mode     | 備考           |
| ------------ | ---------------------- | ------------- | ------------- | -------------- |
| success-text | `--color-success-text` | `--green-700` | `--green-400` | 成功テキスト   |
| success-bg   | `--color-success-bg`   | `--green-50`  | `--green-900` | 成功背景       |
| warning-text | `--color-warning-text` | `--amber-700` | `--amber-400` | 警告テキスト   |
| warning-bg   | `--color-warning-bg`   | `--amber-50`  | `--amber-900` | 警告背景       |
| error-text   | `--color-error-text`   | `--red-700`   | `--red-400`   | エラーテキスト |
| error-bg     | `--color-error-bg`     | `--red-50`    | `--red-900`   | エラー背景     |
| info-text    | `--color-info-text`    | `--blue-700`  | `--blue-400`  | 情報テキスト   |
| info-bg      | `--color-info-bg`      | `--blue-50`   | `--blue-900`  | 情報背景       |
