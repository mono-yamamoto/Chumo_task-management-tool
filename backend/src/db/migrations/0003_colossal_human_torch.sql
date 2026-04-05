DROP INDEX "tasks_assignee_ids_idx";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "pet_issue_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "task_sessions_user_active_idx" ON "task_sessions" USING btree ("user_id") WHERE "task_sessions"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "tasks_assignee_ids_idx" ON "tasks" USING gin ("assignee_ids");