DROP INDEX "tasks_assignee_ids_idx";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "pet_issue_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
CREATE INDEX "tasks_assignee_ids_idx" ON "tasks" USING gin ("assignee_ids");