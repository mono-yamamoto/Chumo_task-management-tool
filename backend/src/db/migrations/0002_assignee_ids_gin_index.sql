-- assigneeIds配列カラムのインデックスをB-treeからGINに変更
-- arrayContains (@>) クエリのパフォーマンス向上
DROP INDEX IF EXISTS tasks_assignee_ids_idx;
CREATE INDEX tasks_assignee_ids_idx ON tasks USING gin (assignee_ids);
