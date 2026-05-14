-- Phase C PR 1 — apps.video_url + vendor_gallery_images.
-- Hand-written, idempotent.
--
-- apps.video_url: vendor-supplied YouTube / Vimeo URL for the
-- product detail page video block. Validated + normalised at the
-- Zod layer (lib/media/video.ts); the DB just stores text.
--
-- vendor_gallery_images: photos / screenshots that appear on the
-- vendor profile page. Vendor-level (not product-level — keyed on
-- vendor_id). Column shape matches the existing app_screenshots
-- table (url / alt / position) for consistency.
--
-- The dormant app_screenshots table is intentionally left in place
-- (Phase C plan Q1 = leave it).

ALTER TABLE apps ADD COLUMN IF NOT EXISTS video_url TEXT;

CREATE TABLE IF NOT EXISTS vendor_gallery_images (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_vendor_gallery_images_vendor_position
  ON vendor_gallery_images (vendor_id, position);
