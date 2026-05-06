-- Narrow search scope: name + vendor_name only.
-- Drops tagline + description from search_vector, adds denormalised
-- vendor_name column maintained by triggers, recreates search_vector
-- as a GENERATED column over (name, vendor_name).
--
-- Idempotent: every step uses IF [NOT] EXISTS / CREATE OR REPLACE /
-- DROP-then-CREATE so re-running this file is safe.

-- 1. Add vendor_name (nullable initially so the backfill can run).
ALTER TABLE apps ADD COLUMN IF NOT EXISTS vendor_name text;
--> statement-breakpoint

-- 2. Backfill from vendors.
UPDATE apps
   SET vendor_name = v.name
  FROM vendors v
 WHERE apps.vendor_id = v.id
   AND (apps.vendor_name IS NULL OR apps.vendor_name = '');
--> statement-breakpoint

-- 3. Lock down NOT NULL + default for future inserts where the trigger
--    populates the value.
ALTER TABLE apps ALTER COLUMN vendor_name SET NOT NULL;
--> statement-breakpoint
ALTER TABLE apps ALTER COLUMN vendor_name SET DEFAULT '';
--> statement-breakpoint

-- 4. Drop the old GIN index + GENERATED column (the column drop would
--    CASCADE the index, but explicit DROP first protects against
--    half-applied state from a prior failed run).
DROP INDEX IF EXISTS ix_apps_search_vector;
--> statement-breakpoint
ALTER TABLE apps DROP COLUMN IF EXISTS search_vector;
--> statement-breakpoint

-- 5. Recreate search_vector. Name = weight A, vendor_name = weight B.
--    Tagline + description are intentionally absent.
ALTER TABLE apps ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(vendor_name, '')), 'B')
  ) STORED;
--> statement-breakpoint

-- 6. GIN index back on the new column.
CREATE INDEX IF NOT EXISTS ix_apps_search_vector
  ON apps USING gin (search_vector);
--> statement-breakpoint

-- 7. Trigger: BEFORE INSERT/UPDATE on apps. On INSERT or vendor_id
--    change, look up the vendor name and stamp it onto NEW.vendor_name.
--    The OF vendor_id WHEN clause means the UPDATE trigger only fires
--    when vendor_id actually changes, sparing a roundtrip on every
--    other apps update.
CREATE OR REPLACE FUNCTION apps_set_vendor_name()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT name INTO NEW.vendor_name FROM vendors WHERE id = NEW.vendor_id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_apps_set_vendor_name_insert ON apps;
--> statement-breakpoint
CREATE TRIGGER trg_apps_set_vendor_name_insert
  BEFORE INSERT ON apps
  FOR EACH ROW EXECUTE FUNCTION apps_set_vendor_name();
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_apps_set_vendor_name_update ON apps;
--> statement-breakpoint
CREATE TRIGGER trg_apps_set_vendor_name_update
  BEFORE UPDATE OF vendor_id ON apps
  FOR EACH ROW
  WHEN (NEW.vendor_id IS DISTINCT FROM OLD.vendor_id)
  EXECUTE FUNCTION apps_set_vendor_name();
--> statement-breakpoint

-- 8. Trigger: AFTER UPDATE OF name on vendors. Cascades the rename to
--    every app pointing at this vendor. Bounded by the WHEN clause so
--    no-op renames don't fire pointless UPDATEs.
CREATE OR REPLACE FUNCTION vendors_propagate_name_to_apps()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE apps SET vendor_name = NEW.name WHERE vendor_id = NEW.id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_vendors_propagate_name_to_apps ON vendors;
--> statement-breakpoint
CREATE TRIGGER trg_vendors_propagate_name_to_apps
  AFTER UPDATE OF name ON vendors
  FOR EACH ROW
  WHEN (NEW.name IS DISTINCT FROM OLD.name)
  EXECUTE FUNCTION vendors_propagate_name_to_apps();
