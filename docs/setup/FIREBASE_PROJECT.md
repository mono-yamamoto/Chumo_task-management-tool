# Firebase設定手順（プロジェクトID: project-687214998081）

## Step 1: Firebase CLIにログイン

ターミナルで以下を実行：

```bash
firebase login
```

ブラウザが開くので、Googleアカウントでログインして権限を許可してください。

## Step 2: プロジェクトを設定

```bash
firebase use project-687214998081
```

または、対話形式で設定：

```bash
firebase use --add
# プロンプトで project-687214998081 を選択
# エイリアス名を入力（例: default または production）
```

## Step 3: プロジェクトが正しく設定されたか確認

```bash
firebase use
```

出力に `project-687214998081` が表示されればOKです。

## Step 4: セキュリティルールとインデックスをデプロイ

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Firestoreの使用制限について

Firestoreには以下の制限機能があります：

### 1. 予算アラートの設定（推奨）

Firebase Consoleで設定：

1. Firebase Console → プロジェクト設定 → 「使用量と請求」
2. 「予算とアラート」タブ
3. 「予算を作成」をクリック
4. 予算額を設定（例: $10/月）
5. アラート閾値を設定（例: 50%, 90%, 100%）

### 2. 使用量の制限（App Engine Quotas API使用）

Cloud Functionsで自動的に制限を実装できます：

```typescript
// functions/src/utils/quota.ts の例
import { getFirestore } from 'firebase-admin/firestore';

export async function checkQuota(): Promise<boolean> {
  // 月間の読み取り回数をチェック
  // 制限を超えた場合はfalseを返す
  // 実装はFirebase Admin SDKの使用量APIを使用
}
```

### 3. 推奨される設定

- **予算アラート**: 必ず設定（無料）
- **日次/週次の使用量チェック**: Cloud Functionsで自動チェック
- **使用量ダッシュボード**: Firebase Consoleで定期的に確認

### 4. 無料枠の範囲

Firestoreの無料枠（Sparkプラン）：

- 読み取り: 50,000回/日
- 書き込み: 20,000回/日
- 削除: 20,000回/日
- ストレージ: 1GB

Blazeプラン（従量課金）にアップグレードすると、より柔軟な制限設定が可能です。

### 5. 実装例：使用量チェック機能

必要であれば、使用量を監視するCloud Functionを追加できます。
