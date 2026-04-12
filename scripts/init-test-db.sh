#!/bin/bash
# Docker初期化時にテスト用DBを自動作成
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE chumo_test OWNER $POSTGRES_USER'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chumo_test')\gexec
EOSQL
