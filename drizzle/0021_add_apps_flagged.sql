ALTER TABLE "apps" ADD COLUMN "flagged" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX "ix_apps_flagged" ON "apps" ("flagged") WHERE "flagged" = true;
