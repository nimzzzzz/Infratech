-- Updated-at maintenance trigger.
-- One shared function, fired BEFORE UPDATE on every table that has an
-- updated_at column. Keeps the "is this row stale?" semantic consistent
-- without scattering `updated_at = now()` into every UPDATE.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER trg_stages_updated_at         BEFORE UPDATE ON stages         FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_capabilities_updated_at   BEFORE UPDATE ON capabilities   FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_industries_updated_at     BEFORE UPDATE ON industries     FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_pricing_models_updated_at BEFORE UPDATE ON pricing_models FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_regions_updated_at        BEFORE UPDATE ON regions        FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_vendors_updated_at        BEFORE UPDATE ON vendors        FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_apps_updated_at           BEFORE UPDATE ON apps           FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_submissions_updated_at    BEFORE UPDATE ON submissions    FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_suggestions_updated_at    BEFORE UPDATE ON suggestions    FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_admins_updated_at         BEFORE UPDATE ON admins         FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER trg_contact_messages_updated_at BEFORE UPDATE ON contact_messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
