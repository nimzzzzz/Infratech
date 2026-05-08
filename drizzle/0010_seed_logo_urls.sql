-- Populate vendor + app logo_url for visual testing of how the
-- directory looks once vendor logos are uploaded.
--
-- 10 of 14 vendors have a logo file in public/logos/vendors/. The
-- other 4 (rdash, buildroid-robotics, white-helmet-safety,
-- bridge2ai) had no usable favicon source — they fall back to the
-- LetterAvatar component when logo_url is NULL.
--
-- After updating vendors, the same logo cascades to every app
-- owned by that vendor (Aconex + Primavera P6 both inherit
-- Oracle's logo via the apps.vendor_id join).
--
-- Idempotent — matched by slug + on the apps side by vendor_id;
-- re-running the file just re-asserts the same values.

UPDATE vendors SET logo_url = '/logos/vendors/oracle.png' WHERE slug = 'oracle';
--> statement-breakpoint
UPDATE vendors SET logo_url = '/logos/vendors/procore-technologies.png' WHERE slug = 'procore-technologies';
--> statement-breakpoint
UPDATE vendors SET logo_url = '/logos/vendors/nplan.png' WHERE slug = 'nplan';
--> statement-breakpoint
UPDATE vendors SET logo_url = '/logos/vendors/cognite.png' WHERE slug = 'cognite';
--> statement-breakpoint
UPDATE vendors SET logo_url = '/logos/vendors/microsoft.png' WHERE slug = 'microsoft';
--> statement-breakpoint
UPDATE vendors SET logo_url = '/logos/vendors/bentley-systems.png' WHERE slug = 'bentley-systems';
--> statement-breakpoint
UPDATE vendors SET logo_url = '/logos/vendors/ibm.png' WHERE slug = 'ibm';
--> statement-breakpoint
UPDATE vendors SET logo_url = '/logos/vendors/alice-technologies.png' WHERE slug = 'alice-technologies';
--> statement-breakpoint
UPDATE vendors SET logo_url = '/logos/vendors/smartpm-technologies.png' WHERE slug = 'smartpm-technologies';
--> statement-breakpoint
UPDATE vendors SET logo_url = '/logos/vendors/bimcrone.png' WHERE slug = 'bimcrone';
--> statement-breakpoint

-- Propagate vendor logo to every app owned by that vendor. Apps
-- whose vendor has no logo (NULL) stay NULL — the conditional
-- rendering in components/browse/app-card.tsx + app/apps/[slug]/
-- page.tsx falls through to LetterAvatar.
UPDATE apps a
   SET logo_url = v.logo_url
  FROM vendors v
 WHERE a.vendor_id = v.id
   AND v.logo_url IS NOT NULL;
