-- vendor_members: humans who sign in via Clerk and act on a vendor's
-- behalf. Splits the Clerk-session-state out of vendors so multiple
-- humans can represent the same company.
--
-- vendor_id is nullable: at first sign-in we create the row before
-- the human has chosen which company they belong to. /dashboard/
-- onboarding inserts a vendors row and repoints vendor_id.
--
-- Idempotent: every step uses IF [NOT] EXISTS / CREATE OR REPLACE so
-- re-running the file is safe.

CREATE TABLE IF NOT EXISTS vendor_members (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  clerk_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  primary_email TEXT NOT NULL,
  linkedin_url TEXT,
  role TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  suspended BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS ux_vendor_members_clerk_user_id
  ON vendor_members (clerk_user_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ix_vendor_members_vendor
  ON vendor_members (vendor_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ix_vendor_members_suspended
  ON vendor_members (suspended);
--> statement-breakpoint

-- Reuse the set_updated_at() function from migration 0001.
DROP TRIGGER IF EXISTS trg_vendor_members_updated_at ON vendor_members;
--> statement-breakpoint
CREATE TRIGGER trg_vendor_members_updated_at
  BEFORE UPDATE ON vendor_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
