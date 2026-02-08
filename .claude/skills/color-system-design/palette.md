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

| Token          | Light Mode            | Dark Mode             | 備考                |
| -------------- | --------------------- | --------------------- | ------------------- |
| text-primary   | neutral-900 `#111827` | neutral-50 `#F9FAFB`  | 本文テキスト        |
| text-secondary | neutral-500 `#6B7280` | neutral-400 `#9CA3AF` | 補助テキスト        |
| text-tertiary  | neutral-400 `#9CA3AF` | neutral-500 `#6B7280` | プレースホルダー等  |
| text-disabled  | neutral-300 `#D1D5DB` | neutral-600 `#4B5563` | 無効状態            |
| text-link      | teal-700 `#007170`    | teal-400 `#27C2C1`    | リンク（4.5:1確保） |

### Background

| Token           | Light Mode            | Dark Mode             | 備考                   |
| --------------- | --------------------- | --------------------- | ---------------------- |
| bg-primary      | white `#FFFFFF`       | neutral-800 `#1F2937` | ページ背景             |
| bg-secondary    | neutral-50 `#F9FAFB`  | neutral-700 `#374151` | カード・セクション背景 |
| bg-tertiary     | neutral-100 `#F3F4F6` | neutral-600 `#4B5563` | ネスト背景             |
| bg-brand-subtle | teal-50 `#EEFBFB`     | teal-950 `#002625`    | ブランドtint背景       |

### Border

| Token          | Light Mode            | Dark Mode             | 備考                    |
| -------------- | --------------------- | --------------------- | ----------------------- |
| border-default | neutral-200 `#E5E7EB` | neutral-600 `#4B5563` | 通常ボーダー（3:1確保） |
| border-strong  | neutral-400 `#9CA3AF` | neutral-400 `#9CA3AF` | 強調ボーダー            |
| border-focus   | teal-500 `#00A8A7`    | teal-400 `#27C2C1`    | フォーカスリング        |

### Primary (Brand/Action)

| Token           | Light Mode         | Dark Mode          | 備考                |
| --------------- | ------------------ | ------------------ | ------------------- |
| primary-default | teal-600 `#008B8A` | teal-400 `#27C2C1` | ボタン背景・CTA     |
| primary-hover   | teal-700 `#007170` | teal-300 `#55D5D4` | ホバー状態          |
| primary-active  | teal-800 `#005857` | teal-500 `#00A8A7` | アクティブ/押下状態 |

### Status

| Token        | Light Mode          | Dark Mode           | 備考           |
| ------------ | ------------------- | ------------------- | -------------- |
| success-text | green-700 `#15803D` | green-400 `#4ADE80` | 成功テキスト   |
| success-bg   | green-50 `#F0FDF4`  | green-900 `#14532D` | 成功背景       |
| warning-text | amber-700 `#B45309` | amber-400 `#FBBF24` | 警告テキスト   |
| warning-bg   | amber-50 `#FFFBEB`  | amber-900 `#78350F` | 警告背景       |
| error-text   | red-700 `#B91C1C`   | red-400 `#F87171`   | エラーテキスト |
| error-bg     | red-50 `#FEF2F2`    | red-900 `#7F1D1D`   | エラー背景     |
| info-text    | blue-700 `#1D4ED8`  | blue-400 `#60A5FA`  | 情報テキスト   |
| info-bg      | blue-50 `#EFF6FF`   | blue-900 `#1E3A8A`  | 情報背景       |
