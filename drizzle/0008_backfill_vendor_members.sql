-- Backfill vendor_members for every vendors row that was created via
-- the Clerk webhook (i.e. has a non-null clerk_user_id). Each such row
-- represents a real human who signed in but whose record was stored
-- in the (then-conflated) vendors table.
--
-- After this runs, the human is represented by a vendor_members row
-- pointing at the existing (placeholder) vendors row. They'll go
-- through the new onboarding flow next time they hit /dashboard, which
-- creates a fresh vendors row with real company info and repoints
-- vendor_member.vendor_id. The placeholder gets orphaned (no apps,
-- no other members) — fine, it's data exhaust from the old model.
--
-- Idempotent via the unique index on clerk_user_id.

INSERT INTO vendor_members
  (vendor_id, clerk_user_id, name, primary_email, onboarded)
SELECT
  v.id,
  v.clerk_user_id,
  v.name,
  COALESCE(v.contact_email, v.clerk_user_id || '@unknown.example'),
  FALSE
FROM vendors v
WHERE v.clerk_user_id IS NOT NULL
ON CONFLICT (clerk_user_id) DO NOTHING;
