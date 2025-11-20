#!/bin/bash
# claude.md更新提案フック用スクリプト
# SessionEnd/PreCompactフックから呼び出され、会話履歴を分析

set -euo pipefail

# 再帰実行を防ぐ（無限ループ対策）
#
# 問題: SessionEndフック内でclaudeを実行すると、そのclaudeの終了時に
#       またSessionEndフックが発火し、無限ループになる
#
# 解決策: 環境変数SUGGEST_CLAUDE_MD_RUNNINGで「実行中」フラグを管理
#   - 初回実行時: 変数は未設定 → フラグを立てて処理続行
#   - 2回目以降: 変数が"1" → 既に実行中と判断してスキップ
#   - 環境変数は子プロセス（ターミナル内のclaude）にも引き継がれる
if [ "${SUGGEST_CLAUDE_MD_RUNNING:-}" = "1" ]; then
  echo "Already running suggest-claude-md-hook. Skipping to avoid infinite loop." >&2
  exit 0
fi
export SUGGEST_CLAUDE_MD_RUNNING=1

# プロジェクトルートを取得（このスクリプトはbin/にあることを前提）
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# フックからこれまでのセッションの会話履歴JSONを読み込み
HOOK_INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path')

if [ -z "$TRANSCRIPT_PATH" ] || [ "$TRANSCRIPT_PATH" = "null" ]; then
  echo "No transcript path found in hook input. Skipping." >&2
  exit 0
fi

# 会話IDとタイムスタンプを取得（ログファイル名用）
CONVERSATION_ID=$(basename "$TRANSCRIPT_PATH" .jsonl | sed 's/.*-//' || echo "unknown")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/suggest-claude-md-${CONVERSATION_ID}-${TIMESTAMP}.log"

# フック情報を記録
HOOK_INFO="Hook type: $(echo "$HOOK_INPUT" | jq -r '.hook_type // "unknown"')
Transcript path: $TRANSCRIPT_PATH
Conversation ID: $CONVERSATION_ID
Timestamp: $(date -Iseconds)"

# 一時ファイルを作成
TEMP_PROMPT_FILE=$(mktemp)
TEMP_CLAUDE_OUTPUT=$(mktemp)
TEMP_SCRIPT=$(mktemp)

# 会話履歴を読み込んでプロンプトを作成
{
  echo "以下の会話履歴を分析して、CLAUDE.mdに追記すべきルールやパターンを提案してください。"
  echo ""
  echo "会話履歴:"
  echo "---"
  cat "$TRANSCRIPT_PATH" | jq -r '.content[] | select(.type == "text") | .text' | tail -100
  echo "---"
  echo ""
  echo ".claude/commands/suggest-claude-md.md の指示に従って分析してください。"
} > "$TEMP_PROMPT_FILE"

# ターミナルで実行するスクリプトを作成
cat > "$TEMP_SCRIPT" <<'SCRIPT'
#!/bin/bash
set -euo pipefail

cd '$PROJECT_ROOT'

echo '🔍 会話履歴を分析中...'
echo ''

# Claude Codeでスラッシュコマンドを実行
# 注意: 実際の実行方法はClaude CodeのAPIに依存します
# ここでは、claudeコマンドが利用可能であることを前提としています
# 実際のClaude CodeのAPIに合わせて調整が必要です
claude --command suggest-claude-md --input '$TEMP_PROMPT_FILE' | tee '$TEMP_CLAUDE_OUTPUT'

echo ''
echo '📝 ログファイルを保存中...'
cat '$TEMP_CLAUDE_OUTPUT' > '$LOG_FILE'

# フック情報とプロンプト全文をログファイルに追記
{
  echo ''
  echo ''
  echo '---'
  echo ''
  echo '## フック実行情報'
  echo ''
  echo '$HOOK_INFO'
  echo 'プロンプトファイルパス: $TEMP_PROMPT_FILE'
  echo ''
  echo ''
  echo '---'
  echo ''
  echo '## 実際に渡したプロンプト全文'
  echo ''
  cat '$TEMP_PROMPT_FILE'
} >> '$LOG_FILE'

rm -f '$TEMP_CLAUDE_OUTPUT' '$TEMP_PROMPT_FILE' '$TEMP_SCRIPT'

echo ''
echo '✅ 完了しました'
echo '保存先: $LOG_FILE'
echo ''
echo 'このウィンドウを閉じてください。このウィンドウの内容は、上記のログファイルにも出力されています。'

exit
SCRIPT

# ヒアドキュメント内の変数プレースホルダーを実際の値に置換
# 理由: <<'SCRIPT' でシングルクォートを使っているため、変数が展開されない
#       sedで後から置換することで、特殊文字のエスケープ問題を回避しつつ安全に変数を展開
sed -i '' "s|\$PROJECT_ROOT|$PROJECT_ROOT|g" "$TEMP_SCRIPT"
sed -i '' "s|\$HOOK_INFO|$HOOK_INFO|g" "$TEMP_SCRIPT"
sed -i '' "s|\$LOG_FILE|$LOG_FILE|g" "$TEMP_SCRIPT"
sed -i '' "s|\$TEMP_PROMPT_FILE|$TEMP_PROMPT_FILE|g" "$TEMP_SCRIPT"
sed -i '' "s|\$TEMP_CLAUDE_OUTPUT|$TEMP_CLAUDE_OUTPUT|g" "$TEMP_SCRIPT"
sed -i '' "s|\$TEMP_SCRIPT|$TEMP_SCRIPT|g" "$TEMP_SCRIPT"

chmod +x "$TEMP_SCRIPT"

# ターミナルでスクリプトを実行（macOS用）
if [[ "$OSTYPE" == "darwin"* ]]; then
  osascript <<EOF
tell application "Terminal"
    do script "$TEMP_SCRIPT"
    activate  # ターミナルを前面に出したくない場合はこの行をコメントアウトしてください
end tell
EOF
else
  # Linux/その他のOS用（gnome-terminal等を使用）
  gnome-terminal -- bash -c "$TEMP_SCRIPT; exec bash" 2>/dev/null || \
  xterm -e "$TEMP_SCRIPT" 2>/dev/null || \
  echo "Please run manually: $TEMP_SCRIPT" >&2
fi

echo "" >&2
echo "✅ ターミナルウィンドウで実行中です" >&2
echo "   結果: cat $LOG_FILE" >&2
echo "" >&2

