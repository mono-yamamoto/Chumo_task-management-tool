#!/usr/bin/env bash
set -euo pipefail

# ==============================================================
# Neon (staging) → ローカル Docker Postgres へデータ同期
#
# 使い方:
#   ./scripts/db-sync-from-neon.sh
#
# 前提:
#   - Docker コンテナ chumo-test-postgres が起動中
#   - ローカル DB にマイグレーション適用済み
#   - NEON_DATABASE_URL が設定されている（引数 or .env.neon）
# ==============================================================

CONTAINER="chumo-test-postgres"
LOCAL_USER="chumo"
LOCAL_DB="chumo_dev"

# --- Neon URL の取得 ---
if [ -n "${1:-}" ]; then
  NEON_URL="$1"
elif [ -n "${NEON_DATABASE_URL:-}" ]; then
  NEON_URL="$NEON_DATABASE_URL"
elif [ -f "$(dirname "$0")/../backend/.env.neon" ]; then
  NEON_URL=$(grep '^DATABASE_URL=' "$(dirname "$0")/../backend/.env.neon" | cut -d= -f2-)
else
  echo "❌ Neon の DATABASE_URL が見つかりません"
  echo ""
  echo "以下のいずれかで指定してください:"
  echo "  1) 引数:          ./scripts/db-sync-from-neon.sh 'postgresql://...'"
  echo "  2) 環境変数:      NEON_DATABASE_URL='postgresql://...' ./scripts/db-sync-from-neon.sh"
  echo "  3) ファイル:      backend/.env.neon に DATABASE_URL=postgresql://... を記載"
  exit 1
fi

# --- Docker コンテナ確認 ---
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "❌ Docker コンテナ '${CONTAINER}' が起動していません"
  echo "   → docker start ${CONTAINER}"
  exit 1
fi

echo "🔄 Neon からデータをダンプ中..."
DUMP=$(docker run --rm --network host postgres:17-alpine \
  pg_dump "$NEON_URL" --data-only --no-owner --no-acl --disable-triggers 2>&1) || {
  echo "❌ pg_dump に失敗しました"
  echo "$DUMP"
  exit 1
}

echo "🗑️  ローカル DB のデータをクリア中..."
# 全テーブルを TRUNCATE（外部キー考慮で CASCADE）
docker exec -i "$CONTAINER" psql -U "$LOCAL_USER" -d "$LOCAL_DB" -c "
DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '__drizzle%')
  LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END \$\$;
" > /dev/null

echo "📥 ローカル DB にデータを投入中..."
echo "$DUMP" | docker exec -i "$CONTAINER" psql -U "$LOCAL_USER" -d "$LOCAL_DB" > /dev/null 2>&1

# 件数確認
echo ""
echo "✅ 同期完了！テーブル別レコード数:"
docker exec "$CONTAINER" psql -U "$LOCAL_USER" -d "$LOCAL_DB" -c "
SELECT tablename AS table_name,
       (xpath('/row/cnt/text()', xml_count))[1]::text::int AS count
FROM (
  SELECT tablename,
         query_to_xml('SELECT count(*) AS cnt FROM ' || quote_ident(tablename), false, true, '')  AS xml_count
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename NOT LIKE '__drizzle%'
  ORDER BY tablename
) t;
"
