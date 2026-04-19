ALTER TYPE "public"."progress_status" ADD VALUE 'FAQ公開申請' BEFORE 'IT連絡済み';--> statement-breakpoint
ALTER TABLE "public"."tasks" ALTER COLUMN "flow_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "public"."tasks" ALTER COLUMN "flow_status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "public"."tasks" SET "flow_status" = '対応中' WHERE "flow_status" IN ('週次報告', '月次報告');--> statement-breakpoint
DROP TYPE "public"."flow_status";--> statement-breakpoint
CREATE TYPE "public"."flow_status" AS ENUM('未着手', 'ディレクション', 'コーディング', 'デザイン', '待ち', '対応中', '完了');--> statement-breakpoint
ALTER TABLE "public"."tasks" ALTER COLUMN "flow_status" SET DATA TYPE "public"."flow_status" USING "flow_status"::"public"."flow_status";--> statement-breakpoint
ALTER TABLE "public"."tasks" ALTER COLUMN "flow_status" SET DEFAULT '未着手';