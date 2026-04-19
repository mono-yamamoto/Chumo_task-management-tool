# Chumo スペーシングルール

Ubieデザイントークン参考。Base unit: **4px**。
4の倍数を基本。16pxを基準としてremやsemanticsの値を命名。
XL以降はジャンプ率をつけるために8の倍数刻み。

## Spacing Scale

| px   | rem     | semantics | Usage                                                         |
| ---- | ------- | --------- | ------------------------------------------------------------- |
| 4px  | 0.25rem | xxs       | 極小の値                                                      |
| 8px  | 0.5rem  | xs        | タグ内のpadding、アイコンとテキストのmarginなど、小さめの余白 |
| 12px | 0.75rem | sm        | 調整用                                                        |
| 16px | 1rem    | md        | ボタン内のpadding、近接させたいリスト要素のmargin、など       |
| 24px | 1.5rem  | lg        | コンテンツ間のmargin                                          |
| 40px | 2.5rem  | xl        | コンテンツ間のmargin                                          |
| 64px | 4rem    | xxl       | 極大の値                                                      |
