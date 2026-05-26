ALTER TABLE "apps" ADD COLUMN IF NOT EXISTS "apple_app_store_url" text;
--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN IF NOT EXISTS "google_play_url" text;
