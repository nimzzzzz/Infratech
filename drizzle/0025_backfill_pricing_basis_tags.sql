-- Backfill pricing-basis joins for the seeded directory apps after the
-- taxonomy refresh. This is deliberately additive: existing curated pricing
-- tags are preserved, and missing demo-data joins are inserted.

INSERT INTO app_pricing_models (app_id, pricing_model_id)
SELECT a.id, p.id
FROM (VALUES
  ('alice-technologies',  'per-project-program'),
  ('bimcrone',            'per-project-program'),
  ('bridge2ai',           'per-seat'),
  ('buildroid',           'usage-volume-based'),
  ('nplan',               'per-project-program'),
  ('nplan',               'portfolio-enterprise-agreement'),
  ('primavera-p6',        'portfolio-enterprise-agreement'),
  ('procore',             'per-project-program'),
  ('rdash',               'portfolio-enterprise-agreement'),
  ('white-helmet-safety', 'per-seat'),
  ('cognite-data-fusion', 'services-implementation-contract'),
  ('ms-project',          'per-seat'),
  ('aconex',              'per-project-program'),
  ('synchro-4d',          'per-seat'),
  ('maximo',              'portfolio-enterprise-agreement'),
  ('maximo',              'services-implementation-contract'),
  ('smartpm',             'per-project-program')
) AS v(app_slug, pricing_slug)
JOIN apps a ON a.slug = v.app_slug
JOIN pricing_models p ON p.slug = v.pricing_slug
ON CONFLICT (app_id, pricing_model_id) DO NOTHING;
