# GCP Secret Managerの代替案

## 選択肢の比較

### 1. GCP Secret Manager（現在の実装）✅ 推奨

**メリット**:
- ✅ セキュリティが高い（暗号化保存、アクセスログ記録）
- ✅ コードから完全に分離できる
- ✅ トークン更新が簡単（コード変更不要）
- ✅ アクセス権限を細かく制御できる
- ✅ GCP/Firebaseと統合されている

**デメリット**:
- ❌ 初期設定が少し手間
- ❌ 月6回以上のアクセスで課金（ただし非常に安い）

**料金**: 月6回まで無料、以降は1アクセス$0.06

---

### 2. Firebase Functionsの環境変数（代替案）

Firebase Functionsでは環境変数を設定できます。

**メリット**:
- ✅ 設定が簡単（`firebase functions:config:set`）
- ✅ 無料
- ✅ コードから分離できる

**デメリット**:
- ❌ **JSON形式のデータ（サービスアカウントキー）が扱いにくい**
- ❌ 環境変数は文字列のみ（JSONをエスケープする必要がある）
- ❌ 更新時に再デプロイが必要
- ❌ アクセスログが残らない
- ❌ 権限管理がSecret Managerより弱い

**実装方法**:
```bash
# 環境変数を設定
firebase functions:config:set \
  github.token="ghp_your_token" \
  drive.parent_id="14l_ggl_SBo8FxZFDOKnmN7atbmaG-Rdh"

# コードで使用
const githubToken = functions.config().github.token;
```

**問題点**: `DRIVE_SERVICE_ACCOUNT_KEY`（JSON形式）を環境変数で扱うのは困難です。

---

### 3. Firestoreに保存（非推奨）

**メリット**:
- ✅ 設定が簡単
- ✅ 無料

**デメリット**:
- ❌ **セキュリティが低い**（Firestoreは機密情報保存用ではない）
- ❌ アクセスログが残らない
- ❌ 暗号化が弱い
- ❌ ベストプラクティスに反する

**結論**: 機密情報はFirestoreに保存すべきではありません。

---

### 4. コードに直接書く（絶対にNG）

**デメリット**:
- ❌ GitHubにコミットすると漏洩する
- ❌ セキュリティリスクが非常に高い
- ❌ トークン更新時にコード変更が必要

**結論**: 絶対にやらないでください。

---

## 推奨：環境変数とSecret Managerの併用

### 軽量な値は環境変数、機密性の高い値はSecret Manager

| Secret名 | 機密性 | 推奨方法 | 理由 |
|---------|--------|---------|------|
| `DRIVE_PARENT_ID` | 低 | 環境変数 | フォルダIDは公開されても問題ない |
| `CHECKSHEET_TEMPLATE_ID` | 低 | 環境変数 | テンプレートIDは公開されても問題ない |
| `MAKE_WEBHOOK_SECRET` | 中 | Secret Manager | 秘密鍵なので機密性が高い |
| `GITHUB_TOKEN` | 高 | Secret Manager | トークンは機密情報 |
| `DRIVE_SERVICE_ACCOUNT_KEY` | 高 | Secret Manager | JSON形式で環境変数では扱いにくい |

---

## 実装変更案：環境変数とSecret Managerの併用

### 変更が必要なファイル

1. **`functions/src/drive/create.ts`**
   - `DRIVE_PARENT_ID` → 環境変数
   - `CHECKSHEET_TEMPLATE_ID` → 環境変数
   - `DRIVE_SERVICE_ACCOUNT_KEY` → Secret Manager（JSON形式のため）

2. **`functions/src/github/create.ts`**
   - `GITHUB_TOKEN` → Secret Manager（機密性が高いため）

3. **`functions/src/sync/backlog.ts`**
   - `MAKE_WEBHOOK_SECRET` → Secret Manager（秘密鍵のため）

### コード変更例

```typescript
// 環境変数から取得（軽量な値）
const driveParentId = process.env.DRIVE_PARENT_ID || functions.config().drive?.parent_id;

// Secret Managerから取得（機密性の高い値）
const serviceAccountKey = await getSecret("DRIVE_SERVICE_ACCOUNT_KEY");
```

---

## 結論

### 質問への回答

**Q: GCP Secret Managerを使わない選択肢はあるの？**

**A: はい、あります。ただし、完全に避けるのは難しいです。**

**理由**:
1. **`DRIVE_SERVICE_ACCOUNT_KEY`（JSON形式）**: 環境変数では扱いにくい → Secret Managerが最適
2. **`GITHUB_TOKEN`**: 機密性が高い → Secret Managerが推奨
3. **`MAKE_WEBHOOK_SECRET`**: 秘密鍵 → Secret Managerが推奨

**軽量な値（`DRIVE_PARENT_ID`、`CHECKSHEET_TEMPLATE_ID`）は環境変数でも問題ありません。**

### 推奨アプローチ

**ハイブリッド方式**:
- 軽量な値 → Firebase Functionsの環境変数
- 機密性の高い値 → GCP Secret Manager

これにより、Secret Managerの使用量を減らし、コストを抑えつつ、セキュリティも確保できます。

---

## 次のステップ

1. **環境変数で対応できるもの**: `DRIVE_PARENT_ID`、`CHECKSHEET_TEMPLATE_ID`
2. **Secret Managerが必要なもの**: `DRIVE_SERVICE_ACCOUNT_KEY`、`GITHUB_TOKEN`、`MAKE_WEBHOOK_SECRET`

どちらの方式で進めますか？

