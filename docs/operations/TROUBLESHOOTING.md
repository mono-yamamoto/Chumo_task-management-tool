# 開発環境エラー対処法

## よくあるエラーと対処法

### 1. 環境変数が読み込まれない

**エラー例**: `Firebase: Error (auth/invalid-api-key)` や `undefined` エラー

**対処法**:

- `.env.local`ファイルがプロジェクトルート（`package.json`と同じ場所）にあるか確認
- 環境変数名に`NEXT_PUBLIC_`プレフィックスが付いているか確認
- 開発サーバーを再起動（`.env.local`を変更した後は必須）

### 2. Firebase設定値が空

**エラー例**: `apiKey is undefined`

**対処法**:

- `.env.local`の各値が正しく設定されているか確認
- 値の前後に余分なスペースや引用符がないか確認

### 3. ポートが既に使用されている

**エラー例**: `Port 3000 is already in use`

**対処法**:

```bash
# ポート3000を使用しているプロセスを終了
lsof -ti:3000 | xargs kill -9

# または別のポートで起動
PORT=3001 npm run dev
```

### 4. モジュールが見つからない

**エラー例**: `Cannot find module 'firebase'` や `Module not found`

**対処法**:

```bash
npm install
```

### 5. TypeScriptエラー

**エラー例**: 型エラーやインポートエラー

**対処法**:

```bash
# 型定義を再インストール
npm install --save-dev @types/node @types/react @types/react-dom
```
