-- Refresh the market, lifecycle, capability, and pricing-basis taxonomy.
--
-- Existing app joins are preserved by inserting the new target taxonomy rows,
-- copying joins from old rows to their new equivalents, then removing the
-- retired rows. ON CONFLICT makes the migration safe to re-run.

-- Lifecycle stages.
INSERT INTO stages (slug, name, short_description, position) VALUES
  ('general', 'Cross-Lifecycle', 'Cross-stage platforms and products.', 0),
  ('feasibility', 'Strategy & Feasibility', 'Strategies, business cases, options analysis.', 1),
  ('definition', 'Development & Design', 'Scope, planning, development, design.', 2),
  ('delivery', 'Procure & Deliver', 'Procurement, execution, controls, risk.', 3),
  ('post-delivery', 'Handover & Closeout', 'Commissioning, turnover, closeout.', 4),
  ('operations', 'Operate & Maintain', 'Asset management, monitoring, maintenance.', 5),
  ('renewal-exit', 'Renewal & Exit', 'Renewal, repositioning, divestment.', 6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  position = EXCLUDED.position,
  updated_at = NOW();
--> statement-breakpoint

-- Markets.
INSERT INTO industries (slug, name) VALUES
  ('construction', 'Construction & Capital Projects'),
  ('manufacturing', 'Industrial & Manufacturing'),
  ('natural-resources', 'Natural Resources'),
  ('public-civic-assets', 'Public & Civic Assets'),
  ('real-estate', 'Real Estate & Facilities'),
  ('infrastructure', 'Transport & Civil Infrastructure'),
  ('energy', 'Utilities & Energy'),
  ('general', 'Cross-Market')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();
--> statement-breakpoint

-- Capabilities.
INSERT INTO capabilities (slug, name) VALUES
  ('ai-workflow-automation', 'AI & Workflow Automation'),
  ('analytics-reporting', 'Analytics & Reporting'),
  ('asset-facility-management', 'Asset & Facility Management'),
  ('bim-model-coordination', 'BIM & Model Coordination'),
  ('capital-planning-valuation', 'Capital Planning & Valuation'),
  ('contracts-commercial-management', 'Contracts & Commercial Management'),
  ('cost-management', 'Cost Management'),
  ('data-integration-apis', 'Data Integration & APIs'),
  ('design-review', 'Design Review'),
  ('documents-cde', 'Documents & CDE'),
  ('energy-carbon-sustainability', 'Energy, Carbon & Sustainability'),
  ('field-execution', 'Field Execution'),
  ('gis-mapping', 'GIS & Mapping'),
  ('handover-closeout', 'Handover & Closeout'),
  ('maintenance-work-orders', 'Maintenance & Work Orders'),
  ('market-site-intelligence', 'Market & Site Intelligence'),
  ('portfolio-program-management', 'Portfolio & Program Management'),
  ('procurement-supply-chain', 'Procurement & Supply Chain'),
  ('progress-reality-capture', 'Progress & Reality Capture'),
  ('quality-inspections', 'Quality & Inspections'),
  ('risk-management', 'Risk Management'),
  ('safety-compliance', 'Safety & Compliance'),
  ('scheduling-planning', 'Scheduling & Planning'),
  ('space-occupancy', 'Space & Occupancy'),
  ('tenant-resident-experience', 'Tenant / Resident Experience')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();
--> statement-breakpoint

WITH capability_map(old_slug, new_slug) AS (VALUES
  ('ai-agents', 'ai-workflow-automation'),
  ('asset-management', 'asset-facility-management'),
  ('building-information-modelling', 'bim-model-coordination'),
  ('closeout', 'handover-closeout'),
  ('contract-management', 'contracts-commercial-management'),
  ('cost-control', 'cost-management'),
  ('cost-estimation', 'cost-management'),
  ('data-integration', 'data-integration-apis'),
  ('document-control', 'documents-cde'),
  ('field-management', 'field-execution'),
  ('forecasting', 'analytics-reporting'),
  ('hseq', 'safety-compliance'),
  ('monitoring', 'maintenance-work-orders'),
  ('procurement', 'procurement-supply-chain'),
  ('project-portfolio-management', 'portfolio-program-management'),
  ('quality', 'quality-inspections'),
  ('reporting', 'analytics-reporting'),
  ('resource-planning', 'scheduling-planning'),
  ('scheduling', 'scheduling-planning'),
  ('tendering', 'procurement-supply-chain')
)
INSERT INTO app_capabilities (app_id, capability_id)
SELECT ac.app_id, new_cap.id
FROM app_capabilities ac
JOIN capabilities old_cap ON old_cap.id = ac.capability_id
JOIN capability_map cm ON cm.old_slug = old_cap.slug
JOIN capabilities new_cap ON new_cap.slug = cm.new_slug
ON CONFLICT (app_id, capability_id) DO NOTHING;
--> statement-breakpoint

DELETE FROM app_capabilities
WHERE capability_id IN (
  SELECT id FROM capabilities
  WHERE slug IN (
    'ai-agents',
    'asset-management',
    'building-information-modelling',
    'closeout',
    'contract-management',
    'cost-control',
    'cost-estimation',
    'data-integration',
    'document-control',
    'field-management',
    'forecasting',
    'hseq',
    'monitoring',
    'procurement',
    'project-portfolio-management',
    'quality',
    'reporting',
    'resource-planning',
    'scheduling',
    'tendering'
  )
);
--> statement-breakpoint

DELETE FROM capabilities
WHERE slug IN (
  'ai-agents',
  'asset-management',
  'building-information-modelling',
  'closeout',
  'contract-management',
  'cost-control',
  'cost-estimation',
  'data-integration',
  'document-control',
  'field-management',
  'forecasting',
  'hseq',
  'monitoring',
  'procurement',
  'project-portfolio-management',
  'quality',
  'reporting',
  'resource-planning',
  'scheduling',
  'tendering'
);
--> statement-breakpoint

-- Pricing basis.
INSERT INTO pricing_models (slug, name) VALUES
  ('per-seat', 'Per Seat'),
  ('per-project-program', 'Per Project / Program'),
  ('per-asset-site-unit', 'Per Asset / Site / Unit'),
  ('usage-volume-based', 'Usage / Volume-Based'),
  ('transaction-value-based', 'Transaction / Value-Based'),
  ('portfolio-enterprise-agreement', 'Portfolio / Enterprise Agreement'),
  ('services-implementation-contract', 'Services / Implementation Contract')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();
--> statement-breakpoint

WITH pricing_map(old_slug, new_slug) AS (VALUES
  ('user-subscription-freemium', 'per-seat'),
  ('pay-per-use', 'usage-volume-based'),
  ('licensed-by-project', 'per-project-program'),
  ('licensed-by-company-portfolio', 'portfolio-enterprise-agreement'),
  ('service-contract', 'services-implementation-contract')
)
INSERT INTO app_pricing_models (app_id, pricing_model_id)
SELECT apm.app_id, new_pm.id
FROM app_pricing_models apm
JOIN pricing_models old_pm ON old_pm.id = apm.pricing_model_id
JOIN pricing_map pm ON pm.old_slug = old_pm.slug
JOIN pricing_models new_pm ON new_pm.slug = pm.new_slug
ON CONFLICT (app_id, pricing_model_id) DO NOTHING;
--> statement-breakpoint

DELETE FROM app_pricing_models
WHERE pricing_model_id IN (
  SELECT id FROM pricing_models
  WHERE slug IN (
    'user-subscription-freemium',
    'pay-per-use',
    'licensed-by-project',
    'licensed-by-company-portfolio',
    'service-contract'
  )
);
--> statement-breakpoint

DELETE FROM pricing_models
WHERE slug IN (
  'user-subscription-freemium',
  'pay-per-use',
  'licensed-by-project',
  'licensed-by-company-portfolio',
  'service-contract'
);
