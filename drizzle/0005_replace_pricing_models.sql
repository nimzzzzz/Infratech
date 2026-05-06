-- Replace the pricing_models taxonomy with the new 5-row list.
--
-- Destructive on app_pricing_models: every existing row is wiped, since
-- the old slugs (subscription, freemium, priced-by-project-size, etc.)
-- have no clean mapping to the new 5. Per the design call, seeded apps
-- will surface with zero pricing tags after this runs; the Resolute team
-- assigns the new tags via the admin panel.
--
-- Idempotent: TRUNCATE is no-op on empty tables; INSERT … ON CONFLICT
-- DO NOTHING leaves existing rows alone if the file is re-run.

-- 1. Wipe every join-table row first so the parent DELETE doesn't fail
--    on FK references. ON DELETE CASCADE would also work, but explicit
--    is cheaper to reason about.
DELETE FROM app_pricing_models;
--> statement-breakpoint

-- 2. Drop the old taxonomy rows.
DELETE FROM pricing_models;
--> statement-breakpoint

-- 3. Insert the new 5. ON CONFLICT (slug) DO NOTHING because slug has
--    a unique index — re-running the file just re-asserts presence.
INSERT INTO pricing_models (slug, name) VALUES
  ('user-subscription-freemium', 'User Subscription / Freemium'),
  ('pay-per-use', 'Pay-per-use'),
  ('licensed-by-project', 'Licensed by Project'),
  ('licensed-by-company-portfolio', 'Licensed by Company/Portfolio size'),
  ('service-contract', 'Service Contract')
ON CONFLICT (slug) DO NOTHING;
