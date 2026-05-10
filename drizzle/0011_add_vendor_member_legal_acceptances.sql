-- vendor_member_legal_acceptances: audit trail of every legal-
-- acceptance click during onboarding. One row per accept; users
-- may re-accept on terms-version bumps and each lands as its own
-- row.
--
-- The auto-generated drizzle-kit diff for this commit was wider
-- than intended (it tried to redo every prior hand-written
-- migration) so this file is rewritten by hand. Idempotent via
-- IF NOT EXISTS so re-running is safe.

CREATE TABLE IF NOT EXISTS vendor_member_legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_member_id INTEGER NOT NULL REFERENCES vendor_members(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ix_vmla_vendor_member
  ON vendor_member_legal_acceptances (vendor_member_id);
