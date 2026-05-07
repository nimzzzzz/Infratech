-- Drop the now-unused vendors.clerk_user_id and vendors.onboarded
-- columns. Both belong to the human, not the company; they were
-- backfilled into vendor_members in migration 0008 and every code
-- path moved to vendor_members in the auth-helper + webhook
-- rewrites.
--
-- Idempotent: DROP INDEX/COLUMN IF EXISTS makes re-running the file
-- safe.

DROP INDEX IF EXISTS ux_vendors_clerk_user_id;
--> statement-breakpoint
ALTER TABLE vendors DROP COLUMN IF EXISTS clerk_user_id;
--> statement-breakpoint
ALTER TABLE vendors DROP COLUMN IF EXISTS onboarded;
