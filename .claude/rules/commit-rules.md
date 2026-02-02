# Commit Rules

このプロジェクトのコミット作成ルールを定義します。

## 基本原則

- **1コミット=1事柄**: 無関係な変更は分離する
- **日本語メッセージ**: 技術用語の英語使用は可
- **統一フォーマット**: 絵文字 + type + scope + 説明 + Issue番号

## コミットメッセージ形式

### 基本フォーマット

```
<絵文字> <type>(<scope>): <説明> (#<issue>)
```

### 例

```
🐛 fix(auth): ログインエラーメッセージ重複を修正 (#35)
✨ feat(tasks): タスクフィルタリング機能を追加 (#42)
📝 docs(readme): セットアップ手順を更新
♻️ refactor(hooks): useLoginErrorMessage フック分離 (#35)
```

## コミットタイプと絵文字

| Type       | 絵文字 | 説明                  | 使用場面                            |
| ---------- | ------ | --------------------- | ----------------------------------- |
| `feat`     | ✨     | 新機能追加            | 新しい機能やコンポーネントの追加    |
| `fix`      | 🐛     | バグ修正              | バグやエラーの修正                  |
| `docs`     | 📝     | ドキュメント更新      | README、コメント、仕様書の更新      |
| `style`    | 💄     | 見た目のみ変更        | UI/UXの見た目変更（動作に影響なし） |
| `refactor` | ♻️     | リファクタリング      | 動作を変えずにコード構造を改善      |
| `test`     | ✅     | テスト関連            | テストの追加、修正、改善            |
| `build`    | 🔧     | ビルド/スクリプト関連 | webpack、package.json、build設定    |
| `ci`       | 👷     | CI/CD関連             | GitHub Actions、deployment設定      |
| `perf`     | 🚀     | パフォーマンス改善    | 処理速度、メモリ使用量の最適化      |
| `chore`    | ⚙️     | その他、設定変更等    | 依存関係更新、設定ファイル変更      |

## スコープ命名規則

### ディレクトリベース自動判定

- `packages/`配下: パッケージ名
- `app/`配下: ページ名または機能名
- `components/`配下: コンポーネント名
- `hooks/`配下: `hooks`
- `lib/`配下: `lib`
- `types/`配下: `types`
- ルート: `root` または省略

### 例

```
fix(auth): ログイン処理修正          // app/(auth)
feat(tasks): タスク一覧機能追加      // app/(dashboard)/tasks
refactor(hooks): カスタムフック分離   // hooks/
docs(root): README更新              // ルートディレクトリ
```

## Issue番号の付与

- ブランチ名から数字を自動抽出: `issue-35` → `(#35)`
- 複数Issue関連の場合: `(#35, #42)`
- Issue無しの場合: Issue番号省略

## コミット詳細説明（オプション）

必要に応じて、空行後に箇条書きで詳細を追加:

```
🐛 fix(auth): ログインエラーメッセージ重複を修正 (#35)

- ERROR_MESSAGES定数をuseLoginErrorMessageフックに統合
- login/page.tsxの重複定義を削除
- エラーメッセージの一元管理を実現
```

## 実行ルール

### 段階的コミット

1. **変更分析**: 関連性に基づいてファイルをグルーピング
2. **個別コミット**: 各グループごとに1つのコミット作成
3. **適切な分離**: 無関係な変更は別コミットに分ける

### 自動実行原則

- **ノンインタラクティブ**: 確認なしで実行
- **エラー対応**: リンターエラーは修正提案のみ
- **安全性**: ファイルパス適切処理、削除/リネーム対応

## 厳守事項

- **文字数制限**: 1行目は50文字以内
- **動詞統一**: 「修正」「追加」「更新」「削除」等の統一
- **技術用語**: 英語での記載可（React、TypeScript等）
- **一貫性**: プロジェクト内でフォーマットを統一

## NGパターン

```bash
# ❌ 悪い例
git commit -m "fix"
git commit -m "Update files"
git commit -m "作業中"
git commit -m "feat: add new feature and fix bug and update docs"

# ✅ 良い例
git commit -m "🐛 fix(auth): ログイン失敗時のエラー表示修正 (#35)"
git commit -m "✨ feat(tasks): フィルタリング機能追加 (#42)"
git commit -m "📝 docs(readme): セットアップ手順を更新"
```

## Claude Code連携

Claude Codeで自動生成されたコミットには以下を追加:

```
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```
