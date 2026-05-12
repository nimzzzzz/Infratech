-- vendor_members.is_admin — single-human-table admin flag.
-- Phase A.1 (2026-05-12). Supersedes the legacy `admins` table:
-- every authenticated human is a vendor_members row, distinguished
-- by is_admin. The webhook sets this flag against CLERK_ADMIN_EMAILS
-- (email allowlist) on user.created / user.updated.
--
-- Hand-written, idempotent. Same approach as migration 0011 — the
-- drizzle-kit auto-gen wanted to redo earlier hand-written schema
-- edits, which this avoids.

ALTER TABLE vendor_members
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
--> statement-breakpoint

-- Partial index: only the small subset of rows where is_admin=true is
-- worth indexing. Admin lookups via clerk_user_id already use
-- ux_vendor_members_clerk_user_id; this index supports admin-only
-- queries (e.g. listing all admins).
CREATE INDEX IF NOT EXISTS ix_vendor_members_is_admin
  ON vendor_members (is_admin)
  WHERE is_admin = true;
