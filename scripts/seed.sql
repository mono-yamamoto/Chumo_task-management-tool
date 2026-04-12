-- ==============================================================
-- Staging / ローカル用シードデータ
-- プレビューユーザー + デモ用ラベル・タスク・セッション・コメント
-- ==============================================================

BEGIN;

-- ===== 既存シードデータクリア（外部キー考慮で依存順に削除） =====
-- シードIDを明示列挙し、非シードデータを誤削除しない
DELETE FROM task_comments WHERE id IN ('comment-001','comment-002','comment-003','comment-004','comment-005');
DELETE FROM task_sessions WHERE id IN ('session-001','session-002','session-003','session-004','session-005','session-006');
DELETE FROM task_activities WHERE task_id IN ('task-001','task-002','task-003','task-004','task-005','task-006','task-007','task-008','task-009','task-010','task-011','task-012');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_pins') THEN
    EXECUTE 'DELETE FROM task_pins WHERE id IN (''pin-001'',''pin-002'')';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'DELETE FROM notifications WHERE task_id IN (''task-001'',''task-002'',''task-003'',''task-004'',''task-005'',''task-006'',''task-007'',''task-008'',''task-009'',''task-010'',''task-011'',''task-012'')';
  END IF;
END $$;
DELETE FROM task_externals WHERE task_id IN ('task-001','task-002','task-003','task-004','task-005','task-006','task-007','task-008','task-009','task-010','task-011','task-012');
DELETE FROM tasks WHERE id IN ('task-001','task-002','task-003','task-004','task-005','task-006','task-007','task-008','task-009','task-010','task-011','task-012');
DELETE FROM labels WHERE id IN ('kubun-unyo','kubun-kaihatsu','kubun-design','kubun-other');
DELETE FROM users WHERE id IN ('preview-user', 'demo-user-1', 'demo-user-2');

-- ===== ユーザー =====
INSERT INTO users (id, email, display_name, role, is_allowed, created_at, updated_at)
VALUES
  ('preview-user', 'preview@example.com', 'プレビューユーザー', 'admin', true, NOW(), NOW()),
  ('demo-user-1', 'tanaka@example.com', '田中 太郎', 'member', true, NOW(), NOW()),
  ('demo-user-2', 'suzuki@example.com', '鈴木 花子', 'member', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  is_allowed = EXCLUDED.is_allowed,
  updated_at = NOW();

-- ===== ラベル（区分） =====
INSERT INTO labels (id, name, color, project_id, owner_id, created_at, updated_at)
VALUES
  ('kubun-unyo',     '運用',     '#10B981', NULL, 'preview-user', NOW(), NOW()),
  ('kubun-kaihatsu', '開発',     '#3B82F6', NULL, 'preview-user', NOW(), NOW()),
  ('kubun-design',   'デザイン', '#F59E0B', NULL, 'preview-user', NOW(), NOW()),
  ('kubun-other',    'その他',   '#6B7280', NULL, 'preview-user', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  updated_at = NOW();

-- ===== タスク =====
-- ディレクション
INSERT INTO tasks (id, project_type, title, description, flow_status, progress_status, assignee_ids, kubun_label_id, priority, "order", created_by, it_up_date, release_date, created_at, updated_at)
VALUES
  ('task-001', 'REG2017', 'トップページリニューアル', 'ファーストビューのレイアウト変更とヒーロー画像差し替え', 'ディレクション', '仕様確認', ARRAY['preview-user', 'demo-user-1'], 'kubun-kaihatsu', 'high', 1, 'preview-user', NOW() + INTERVAL '14 days', NOW() + INTERVAL '21 days', NOW() - INTERVAL '3 days', NOW()),
  ('task-002', 'REG2017', 'お知らせ一覧ページ追加', 'CMS連携のお知らせ一覧・詳細ページを新規作成', 'ディレクション', '仕様確認', ARRAY['demo-user-2'], 'kubun-kaihatsu', 'medium', 2, 'preview-user', NOW() + INTERVAL '10 days', NOW() + INTERVAL '17 days', NOW() - INTERVAL '2 days', NOW()),
  ('task-003', 'BRGREG', 'FAQ追加: ログイン不具合', 'ログインできない場合のFAQを追加', 'ディレクション', '仕様確認', ARRAY['preview-user'], 'kubun-unyo', 'medium', 3, 'preview-user', NOW() + INTERVAL '5 days', NOW() + INTERVAL '7 days', NOW() - INTERVAL '1 day', NOW()),
  ('task-004', 'DES_FIRE', 'ボタンコンポーネント改修', 'アクセシビリティ対応とバリアント追加', 'ディレクション', '仕様確認', ARRAY['demo-user-1'], 'kubun-design', 'low', 4, 'demo-user-1', NULL, NULL, NOW() - INTERVAL '1 day', NOW()),

-- コーディング
  ('task-005', 'REG2017', 'フォームバリデーション改善', '入力チェックのリアルタイム表示とエラーメッセージ統一', 'コーディング', 'コーディング', ARRAY['preview-user'], 'kubun-kaihatsu', 'high', 5, 'preview-user', NOW() + INTERVAL '3 days', NOW() + INTERVAL '5 days', NOW() - INTERVAL '7 days', NOW()),
  ('task-006', 'MONO', 'レスポンシブ対応: 商品一覧', 'SP/タブレット表示の崩れ修正', 'コーディング', 'コーディング', ARRAY['demo-user-1', 'preview-user'], 'kubun-kaihatsu', 'medium', 6, 'demo-user-1', NOW() + INTERVAL '2 days', NOW() + INTERVAL '4 days', NOW() - INTERVAL '5 days', NOW()),

-- 対応中
  ('task-007', 'BRGREG', 'メール配信停止リンク修正', '配信停止URLが404になる不具合の修正', '対応中', 'コーディング', ARRAY['preview-user'], 'kubun-unyo', 'urgent', 7, 'preview-user', NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days', NOW() - INTERVAL '4 days', NOW()),

-- 待ち
  ('task-008', 'REG2017', 'クライアント確認待ち: デザインカンプ', '第2案のデザインカンプについてクライアント返答待ち', '待ち', '待ち', ARRAY['demo-user-2'], 'kubun-design', 'medium', 8, 'demo-user-2', NULL, NULL, NOW() - INTERVAL '6 days', NOW()),

-- 完了
  ('task-009', 'MONO', 'OGP画像設定', '各ページのOGP画像とmeta情報を設定', '完了', NULL, ARRAY['preview-user'], 'kubun-kaihatsu', 'low', 9, 'preview-user', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '14 days', NOW() - INTERVAL '1 day'),
  ('task-010', 'BRGREG', 'SSL証明書更新', 'ステージング環境のSSL証明書を更新', '完了', NULL, ARRAY['demo-user-1'], 'kubun-unyo', 'high', 10, 'demo-user-1', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days'),

-- 未着手
  ('task-011', 'REG2017', 'パフォーマンス計測ツール導入', 'Core Web Vitals の計測基盤を構築', '未着手', NULL, ARRAY[]::text[], 'kubun-kaihatsu', 'low', 11, 'preview-user', NULL, NULL, NOW(), NOW()),
  ('task-012', 'DES_FIRE', 'アイコンセット更新', 'Lucide Icons v0.300 への更新と不要アイコン削除', '未着手', NULL, ARRAY['demo-user-2'], 'kubun-design', 'low', 12, 'demo-user-2', NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  flow_status = EXCLUDED.flow_status,
  progress_status = EXCLUDED.progress_status,
  assignee_ids = EXCLUDED.assignee_ids,
  priority = EXCLUDED.priority,
  it_up_date = EXCLUDED.it_up_date,
  release_date = EXCLUDED.release_date,
  updated_at = NOW();

-- ===== タイマーセッション（完了済み） =====
INSERT INTO task_sessions (id, task_id, project_type, user_id, started_at, ended_at, duration_sec)
VALUES
  ('session-001', 'task-005', 'REG2017', 'preview-user', NOW() - INTERVAL '6 days' - INTERVAL '2 hours', NOW() - INTERVAL '6 days', 7200),
  ('session-002', 'task-005', 'REG2017', 'preview-user', NOW() - INTERVAL '5 days' - INTERVAL '90 minutes', NOW() - INTERVAL '5 days', 5400),
  ('session-003', 'task-007', 'BRGREG', 'preview-user', NOW() - INTERVAL '3 days' - INTERVAL '45 minutes', NOW() - INTERVAL '3 days', 2700),
  ('session-004', 'task-006', 'MONO', 'demo-user-1', NOW() - INTERVAL '4 days' - INTERVAL '3 hours', NOW() - INTERVAL '4 days', 10800),
  ('session-005', 'task-009', 'MONO', 'preview-user', NOW() - INTERVAL '8 days' - INTERVAL '1 hour', NOW() - INTERVAL '8 days', 3600),
  ('session-006', 'task-010', 'BRGREG', 'demo-user-1', NOW() - INTERVAL '7 days' - INTERVAL '30 minutes', NOW() - INTERVAL '7 days', 1800)
ON CONFLICT (id) DO NOTHING;

-- ===== コメント =====
INSERT INTO task_comments (id, task_id, project_type, author_id, content, mentioned_user_ids, read_by, created_at, updated_at)
VALUES
  ('comment-001', 'task-001', 'REG2017', 'demo-user-1', '<p>ヒーロー画像の候補を3パターン用意しました。確認お願いします。</p>', ARRAY['preview-user'], ARRAY['preview-user', 'demo-user-1'], NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('comment-002', 'task-001', 'REG2017', 'preview-user', '<p>パターンBが良さそうです。レスポンシブの崩れだけ確認してもらえますか？</p>', ARRAY['demo-user-1'], ARRAY['preview-user'], NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('comment-003', 'task-005', 'REG2017', 'preview-user', '<p>バリデーションルールをZodに統一しました。テストも追加済みです。</p>', ARRAY[]::text[], ARRAY['preview-user'], NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('comment-004', 'task-007', 'BRGREG', 'demo-user-2', '<p>配信停止URLのパスが変わっていたようです。修正PRを出しています。</p>', ARRAY['preview-user'], ARRAY['demo-user-2'], NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('comment-005', 'task-007', 'BRGREG', 'preview-user', '<p>確認しました。マージしてデプロイお願いします。</p>', ARRAY['demo-user-2'], ARRAY['preview-user'], NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ===== ピン留め（テーブルが存在する場合のみ） =====
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_pins') THEN
    INSERT INTO task_pins (id, user_id, task_id, "order", pinned_at)
    VALUES
      ('pin-001', 'preview-user', 'task-007', 0, NOW() - INTERVAL '3 days'),
      ('pin-002', 'preview-user', 'task-005', 1, NOW() - INTERVAL '5 days')
    ON CONFLICT (user_id, task_id) DO NOTHING;
  END IF;
END $$;

COMMIT;
