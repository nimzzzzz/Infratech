CREATE TABLE IF NOT EXISTS vendor_leadership_contacts (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_member_id INTEGER REFERENCES vendor_members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_vendor_leadership_contacts_display_order
    CHECK (display_order >= 0 AND display_order < 4)
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ix_vendor_leadership_contacts_vendor
  ON vendor_leadership_contacts (vendor_id);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS ux_vendor_leadership_contacts_vendor_order
  ON vendor_leadership_contacts (vendor_id, display_order);
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_vendor_leadership_contacts_updated_at
  ON vendor_leadership_contacts;
--> statement-breakpoint

CREATE TRIGGER trg_vendor_leadership_contacts_updated_at
  BEFORE UPDATE ON vendor_leadership_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
