-- Pre-populate app_pricing_models for the 15 seeded apps after the
-- pricing-models taxonomy was replaced (migration 0005). Demo data —
-- the Resolute team will adjust via the admin panel as needed.
--
-- Each row resolves app_id and pricing_model_id via slug joins so the
-- migration is portable across environments where ids differ. The
-- join table's primary key is (app_id, pricing_model_id), so
-- ON CONFLICT DO NOTHING makes the file safely re-runnable.
--
-- Assignments are based on each vendor's documented commercial model.

INSERT INTO app_pricing_models (app_id, pricing_model_id)
SELECT a.id, p.id
FROM (VALUES
  ('alice-technologies',     'licensed-by-project'),
  ('bimcrone',               'user-subscription-freemium'),
  ('bridge2ai',              'user-subscription-freemium'),
  ('buildroid',              'pay-per-use'),
  ('nplan',                  'licensed-by-project'),
  ('nplan',                  'licensed-by-company-portfolio'),
  ('primavera-p6',           'user-subscription-freemium'),
  ('primavera-p6',           'licensed-by-company-portfolio'),
  ('procore',                'licensed-by-project'),
  ('rdash',                  'user-subscription-freemium'),
  ('white-helmet-safety',    'user-subscription-freemium'),
  ('cognite-data-fusion',    'service-contract'),
  ('ms-project',             'user-subscription-freemium'),
  ('aconex',                 'licensed-by-project'),
  ('synchro-4d',             'user-subscription-freemium'),
  ('maximo',                 'licensed-by-company-portfolio'),
  ('maximo',                 'service-contract'),
  ('smartpm',                'licensed-by-project')
) AS v(app_slug, pricing_slug)
JOIN apps a ON a.slug = v.app_slug
JOIN pricing_models p ON p.slug = v.pricing_slug
ON CONFLICT (app_id, pricing_model_id) DO NOTHING;
