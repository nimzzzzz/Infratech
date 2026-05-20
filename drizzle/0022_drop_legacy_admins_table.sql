-- A.6 PR 3 — drop the legacy admins table and its dangling FKs on
-- audit_log + submissions. Every Phase A.2+ writer populates the
-- modern vendor_members FK (audit_log.actor_vendor_member_id,
-- submissions.reviewed_by); the legacy columns have been NULL on
-- all writes since the cutover.
--
-- Pre-flight queries (documented in the PR description) must confirm
-- zero orphans BEFORE this file is applied to production:
--   audit_log_orphaned_legacy, audit_log_dual_written,
--   submissions_orphaned_legacy, submissions_dual_written all = 0;
--   admins-without-matching-vendor_members returns zero rows.
--
-- Idempotent: every DROP uses IF EXISTS, so the file is safe to
-- re-run if a step fails mid-way. Order: FKs → indexes → columns →
-- table → enum (matches the dependency chain in reverse).

-- ── 1. Drop FK constraints referencing admins.id ──────────────────
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_admin_id_admins_id_fk;
--> statement-breakpoint
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_reviewer_admin_id_admins_id_fk;
--> statement-breakpoint

-- ── 2. Drop legacy columns + the dedicated index on audit_log ─────
DROP INDEX IF EXISTS ix_audit_admin_created;
--> statement-breakpoint
ALTER TABLE audit_log DROP COLUMN IF EXISTS admin_id;
--> statement-breakpoint
ALTER TABLE submissions DROP COLUMN IF EXISTS reviewer_admin_id;
--> statement-breakpoint

-- ── 3. Drop the admins table + its enum ───────────────────────────
DROP INDEX IF EXISTS ux_admins_clerk_user_id;
--> statement-breakpoint
DROP INDEX IF EXISTS ux_admins_email;
--> statement-breakpoint
DROP TABLE IF EXISTS admins;
--> statement-breakpoint
DROP TYPE IF EXISTS admin_role;
