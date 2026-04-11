#!/usr/bin/env bash
# =============================================================
# Neon → ローカル PostgreSQL データ同期スクリプト
#
# スキーマは Drizzle マイグレーションで管理しているため、
# データのみを pg_dump/psql で同期する。
#
# 使い方:
#   bun run db:sync-from-neon          # backend/.env.neon の接続先から同期
#   bun run db:sync-from-neon --dry    # ダンプだけ作成（ローカルDBに書き込まない）
# =============================================================

set -euo pipefail

# --- 色付き出力 ---
info()  { printf "\033[1;34m%s\033[0m\n" "$1"; }
ok()    { printf "\033[1;32m%s\033[0m\n" "$1"; }
warn()  { printf "\033[1;33m%s\033[0m\n" "$1"; }
err()   { printf "\033[1;31m%s\033[0m\n" "$1" >&2; }

# --- 引数パース ---
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry) DRY_RUN=true ;;
  esac
done

# --- プロジェクトルートに移動 ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- pg_dump / psql のパス解決 ---
# brew install libpq でインストール済みだが PATH に通ってないケースに対応
if command -v pg_dump &>/dev/null; then
  PG_DUMP="pg_dump"
  PSQL="psql"
else
  LIBPQ_BIN="$(brew --prefix libpq 2>/dev/null)/bin"
  if [[ -x "$LIBPQ_BIN/pg_dump" ]]; then
    PG_DUMP="$LIBPQ_BIN/pg_dump"
    PSQL="$LIBPQ_BIN/psql"
  else
    err "pg_dump / psql が見つかりません"
    echo "  brew install libpq"
    echo "  (PATH に通す場合: brew link --force libpq)"
    exit 1
  fi
fi

NEON_ENV_FILE="$ROOT_DIR/backend/.env.neon"
if [[ ! -f "$NEON_ENV_FILE" ]]; then
  err "backend/.env.neon が見つかりません"
  echo "  Neonの接続文字列を以下の形式で記述してください:"
  echo "  DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb"
  exit 1
fi

# --- 接続情報 ---
NEON_URL=$(grep '^DATABASE_URL=' "$NEON_ENV_FILE" | cut -d'=' -f2-)
LOCAL_URL="postgresql://chumo:chumo_dev@localhost:5432/chumo_dev"

if [[ -z "$NEON_URL" ]]; then
  err "backend/.env.neon に DATABASE_URL が設定されていません"
  exit 1
fi

# --- Docker コンテナ確認 ---
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'chumo-postgres\|chumo-test-postgres'; then
  warn "ローカルの PostgreSQL コンテナが起動していません。起動します..."
  docker compose -f "$ROOT_DIR/docker-compose.yml" up -d postgres
  sleep 2
fi

# ローカル接続テスト
if ! "$PSQL" "$LOCAL_URL" -c "SELECT 1" &>/dev/null; then
  err "ローカルDB ($LOCAL_URL) に接続できません"
  echo "  docker compose up -d で起動してください"
  exit 1
fi

# --- Drizzle マイグレーション適用確認 ---
TABLE_COUNT=$("$PSQL" "$LOCAL_URL" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
if [[ "$TABLE_COUNT" -lt 5 ]]; then
  warn "ローカルDBにテーブルが少ないです (${TABLE_COUNT}個)。マイグレーションを先に実行してください:"
  echo "  bun run backend:db:migrate"
  exit 1
fi

# --- ダンプ ---
DUMP_FILE=$(mktemp /tmp/neon_dump_XXXXXX.sql)
trap 'rm -f "$DUMP_FILE"' EXIT

info "Neon からデータをダンプ中..."
"$PG_DUMP" "$NEON_URL" \
  --data-only \
  --no-owner \
  --no-acl \
  --disable-triggers \
  --no-comments \
  --exclude-table='drizzle.__drizzle_migrations' \
  -f "$DUMP_FILE"

# Neon 独自の SET パラメータを除去（ローカル PostgreSQL では未対応）
sed -i.bak '/^SET transaction_timeout/d' "$DUMP_FILE"
rm -f "$DUMP_FILE.bak"

DUMP_SIZE=$(wc -c < "$DUMP_FILE" | tr -d ' ')
if command -v numfmt &>/dev/null; then
  HUMAN_SIZE=$(numfmt --to=iec "$DUMP_SIZE")
else
  HUMAN_SIZE="$(( DUMP_SIZE / 1024 )) KB"
fi
info "ダンプ完了 ($HUMAN_SIZE)"

if $DRY_RUN; then
  ok "ドライラン: ダンプファイル → $DUMP_FILE"
  trap - EXIT  # ファイル削除しない
  exit 0
fi

# --- ローカルDBクリーンアップ & リストア ---
info "ローカルDBをクリーンアップ中..."
"$PSQL" "$LOCAL_URL" --quiet --output=/dev/null -c "
  TRUNCATE TABLE
    notifications,
    task_activities,
    task_comments,
    task_sessions,
    task_externals,
    task_pins,
    tasks,
    labels,
    contacts,
    projects,
    users
  CASCADE;
"

info "ローカルDBにリストア中..."
"$PSQL" "$LOCAL_URL" -f "$DUMP_FILE" --quiet --output=/dev/null

# --- 件数確認 ---
info "同期結果:"
"$PSQL" "$LOCAL_URL" -c "
  SELECT 'users' AS table_name, count(*) FROM users
  UNION ALL SELECT 'projects', count(*) FROM projects
  UNION ALL SELECT 'labels', count(*) FROM labels
  UNION ALL SELECT 'tasks', count(*) FROM tasks
  UNION ALL SELECT 'task_externals', count(*) FROM task_externals
  UNION ALL SELECT 'task_sessions', count(*) FROM task_sessions
  UNION ALL SELECT 'task_comments', count(*) FROM task_comments
  UNION ALL SELECT 'task_activities', count(*) FROM task_activities
  UNION ALL SELECT 'task_pins', count(*) FROM task_pins
  UNION ALL SELECT 'notifications', count(*) FROM notifications
  UNION ALL SELECT 'contacts', count(*) FROM contacts
  ORDER BY 1;
"

ok "同期完了!"
