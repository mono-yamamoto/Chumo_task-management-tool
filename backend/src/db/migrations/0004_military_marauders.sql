CREATE TABLE "task_pins" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_id" text NOT NULL,
	"order" real DEFAULT 0 NOT NULL,
	"pinned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_color" text;--> statement-breakpoint
ALTER TABLE "task_pins" ADD CONSTRAINT "task_pins_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_pins_user_task_idx" ON "task_pins" USING btree ("user_id","task_id");--> statement-breakpoint
CREATE INDEX "task_pins_user_id_idx" ON "task_pins" USING btree ("user_id");