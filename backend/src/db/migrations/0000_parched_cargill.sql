CREATE TYPE "public"."activity_type" AS ENUM('sync', 'timerStart', 'timerStop', 'update', 'driveCreate', 'fireCreate');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('pending', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('error', 'feature', 'other');--> statement-breakpoint
CREATE TYPE "public"."external_source" AS ENUM('backlog');--> statement-breakpoint
CREATE TYPE "public"."flow_status" AS ENUM('未着手', 'ディレクション', 'コーディング', 'デザイン', '待ち', '対応中', '週次報告', '月次報告', '完了');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."progress_status" AS ENUM('未着手', '仕様確認', '待ち', '調査', '見積', 'CO', 'ロック解除待ち', 'デザイン', 'コーディング', '品管チェック', 'IT連絡済み', 'ST連絡済み', 'SENJU登録', '親課題');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('REG2017', 'BRGREG', 'MONO', 'MONO_ADMIN', 'DES_FIRE', 'DesignSystem', 'DMREG2', 'monosus', 'PRREG');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('ok', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "contact_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_email" text NOT NULL,
	"error_report_details" jsonb,
	"github_issue_url" text,
	"status" "contact_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"project_id" text,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"member_ids" text[] DEFAULT '{}' NOT NULL,
	"backlog_project_key" text,
	"drive_parent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"project_type" "project_type" NOT NULL,
	"type" "activity_type" NOT NULL,
	"actor_id" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"project_type" "project_type" NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"mentioned_user_ids" text[] DEFAULT '{}',
	"read_by" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_externals" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"source" "external_source" NOT NULL,
	"issue_id" text NOT NULL,
	"issue_key" text NOT NULL,
	"url" text NOT NULL,
	"last_synced_at" timestamp with time zone NOT NULL,
	"sync_status" "sync_status" DEFAULT 'ok' NOT NULL,
	CONSTRAINT "task_externals_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
CREATE TABLE "task_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"project_type" "project_type" NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_sec" integer DEFAULT 0 NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_type" "project_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"flow_status" "flow_status" DEFAULT '未着手' NOT NULL,
	"progress_status" "progress_status",
	"assignee_ids" text[] DEFAULT '{}' NOT NULL,
	"it_up_date" timestamp with time zone,
	"release_date" timestamp with time zone,
	"kubun_label_id" text NOT NULL,
	"google_drive_url" text,
	"fire_issue_url" text,
	"google_chat_thread_url" text,
	"backlog_url" text,
	"due_date" timestamp with time zone,
	"priority" "priority",
	"order" real DEFAULT 0 NOT NULL,
	"over3_reason" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"is_allowed" boolean DEFAULT false NOT NULL,
	"github_username" text,
	"google_refresh_token" text,
	"google_oauth_updated_at" timestamp with time zone,
	"chat_id" text,
	"fcm_tokens" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_externals" ADD CONSTRAINT "task_externals_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_sessions" ADD CONSTRAINT "task_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_activities_task_id_idx" ON "task_activities" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_comments_task_id_idx" ON "task_comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_comments_author_id_idx" ON "task_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "task_sessions_task_id_idx" ON "task_sessions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_sessions_user_id_idx" ON "task_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_sessions_ended_at_idx" ON "task_sessions" USING btree ("ended_at");--> statement-breakpoint
CREATE INDEX "tasks_project_type_idx" ON "tasks" USING btree ("project_type");--> statement-breakpoint
CREATE INDEX "tasks_flow_status_idx" ON "tasks" USING btree ("flow_status");--> statement-breakpoint
CREATE INDEX "tasks_assignee_ids_idx" ON "tasks" USING btree ("assignee_ids");--> statement-breakpoint
CREATE INDEX "tasks_order_idx" ON "tasks" USING btree ("order");--> statement-breakpoint
CREATE INDEX "tasks_project_type_flow_status_idx" ON "tasks" USING btree ("project_type","flow_status");