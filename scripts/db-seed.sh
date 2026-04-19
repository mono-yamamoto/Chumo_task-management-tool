#!/usr/bin/env bash
set -euo pipefail

# ==============================================================
# シードデータ投入スクリプト
#
# 使い方:
#   ./scripts/db-seed.sh              # ローカル Docker DB に投入
#   ./scripts/db-seed.sh --staging    # Neon staging DB に投入
#
# ローカル前提:
#   - Docker コンテナ chumo-postgres が起動中
# staging 前提:
#   - backend/.dev.vars の NEON_DATABASE_URL、または
#     backend/.env.neon の DATABASE_URL が設定されている
# ==============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SEED_SQL="$SCRIPT_DIR/seed.sql"

if [ ! -f "$SEED_SQL" ]; then
  echo "❌ seed.sql が見つかりません: $SEED_SQL"
  exit 1
fi

TARGET="${1:-local}"

case "$TARGET" in
  --staging)
    # Neon staging DB に接続
    if [ -n "${NEON_DATABASE_URL:-}" ]; then
      DB_URL="$NEON_DATABASE_URL"
    elif [ -f "$SCRIPT_DIR/../backend/.env.neon" ]; then
      DB_URL=$(grep '^DATABASE_URL=' "$SCRIPT_DIR/../backend/.env.neon" | cut -d= -f2-)
    else
      echo "❌ Neon の DATABASE_URL が見つかりません"
      echo ""
      echo "以下のいずれかで指定してください:"
      echo "  1) 環境変数: NEON_DATABASE_URL='postgresql://...' ./scripts/db-seed.sh --staging"
      echo "  2) ファイル: backend/.env.neon に DATABASE_URL=postgresql://... を記載"
      exit 1
    fi

    echo "🌱 Neon staging DB にシード投入中..."
    psql -v ON_ERROR_STOP=1 "$DB_URL" -f "$SEED_SQL"
    echo "✅ staging シード完了！"
    ;;

  *)
    # ローカル Docker DB に投入
    # .dev.vars の DATABASE_URL をパースして Docker 経由で接続
    DEV_VARS="$SCRIPT_DIR/../backend/.dev.vars"
    if [ -f "$DEV_VARS" ]; then
      DB_URL=$(grep '^DATABASE_URL=' "$DEV_VARS" | head -1 | cut -d= -f2-)
    fi

    if [ -z "${DB_URL:-}" ]; then
      echo "❌ backend/.dev.vars に DATABASE_URL が見つかりません"
      exit 1
    fi

    # postgresql://user:pass@host:port/dbname からパース
    DB_USER=$(echo "$DB_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$DB_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

    # ポートにバインドされている Docker コンテナを探す
    CONTAINER=$(docker ps --format '{{.Names}} {{.Ports}}' | grep "0.0.0.0:${DB_PORT}->" | awk '{print $1}' | head -1)

    if [ -z "$CONTAINER" ]; then
      echo "❌ ポート ${DB_PORT} にバインドされた Docker コンテナが見つかりません"
      echo "   → docker start chumo-postgres または bun run backend:dev で起動"
      exit 1
    fi

    echo "🌱 ローカル DB にシード投入中..."
    echo "   → コンテナ: ${CONTAINER}, DB: ${DB_NAME}"
    docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$SEED_SQL"
    echo "✅ ローカルシード完了！"
    ;;
esac
