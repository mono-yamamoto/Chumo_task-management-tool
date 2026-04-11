ALTER TYPE "public"."progress_status" ADD VALUE 'FAQ公開申請' BEFORE 'IT連絡済み';--> statement-breakpoint
ALTER TABLE "public"."tasks" ALTER COLUMN "flow_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "public"."tasks" ALTER COLUMN "flow_status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."flow_status";--> statement-breakpoint
CREATE TYPE "public"."flow_status" AS ENUM('未着手', 'ディレクション', 'コーディング', 'デザイン', '待ち', '対応中', '完了');--> statement-breakpoint
ALTER TABLE "public"."tasks" ALTER COLUMN "flow_status" SET DATA TYPE "public"."flow_status" USING "flow_status"::"public"."flow_status";--> statement-breakpoint
ALTER TABLE "public"."tasks" ALTER COLUMN "flow_status" SET DEFAULT '未着手';