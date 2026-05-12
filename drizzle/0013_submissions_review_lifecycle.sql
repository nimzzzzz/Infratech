-- Phase A.2 — submissions review lifecycle.
-- Renames enum values to the spec names, adds the columns the state
-- machine needs, and gives audit_log an actor FK that works in the
-- single-human-table model (Phase A.1).
--
-- Hand-written, idempotent guards via IF NOT EXISTS / IF EXISTS where
-- Postgres allows them. ALTER TYPE RENAME VALUE is not idempotent
-- (Postgres has no IF NOT EXISTS for it), so we guard with DO blocks
-- that check the catalog first — safe to re-run.

-- 1. Enum renames. pending → pending_review, approved → published.
--    Non-blocking (RENAME VALUE doesn't rewrite rows).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending'
      AND enumtypid = 'submission_status'::regtype
  ) THEN
    ALTER TYPE submission_status RENAME VALUE 'pending' TO 'pending_review';
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'approved'
      AND enumtypid = 'submission_status'::regtype
  ) THEN
    ALTER TYPE submission_status RENAME VALUE 'approved' TO 'published';
  END IF;
END
$$;
--> statement-breakpoint

-- 2. New enum value for the admin-edits-await-vendor-approval state.
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'edited_awaiting_vendor_approval';
--> statement-breakpoint

-- 3. New submission columns.
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS admin_edits JSONB;
--> statement-breakpoint

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
--> statement-breakpoint

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS vendor_feedback TEXT;
--> statement-breakpoint

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES vendor_members(id) ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ix_submissions_reviewed_by
  ON submissions (reviewed_by)
  WHERE reviewed_by IS NOT NULL;
--> statement-breakpoint

-- 4. Audit-log actor column (nullable FK to vendor_members).
--    Legacy admin_id column stays for back-compat per the Phase A.1
--    locked decision; new writers populate actor_vendor_member_id.
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS actor_vendor_member_id INTEGER
    REFERENCES vendor_members(id) ON DELETE SET NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ix_audit_actor_created
  ON audit_log (actor_vendor_member_id, created_at)
  WHERE actor_vendor_member_id IS NOT NULL;
