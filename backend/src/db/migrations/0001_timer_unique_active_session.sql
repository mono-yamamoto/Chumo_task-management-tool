-- タイマー排他制御: 同一ユーザーの同時稼働セッションを1つに制限
CREATE UNIQUE INDEX task_sessions_user_active_idx ON task_sessions (user_id) WHERE ended_at IS NULL;
