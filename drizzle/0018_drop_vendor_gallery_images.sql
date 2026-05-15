-- Phase C rework — drop vendor_gallery_images.
-- Gallery moved from vendor-level to product-level; the dormant
-- app_screenshots table (keyed on app_id, same column shape) takes
-- over. See feat/move-gallery-to-product for the full refactor.
--
-- Clean drop: only test submissions were ever written against this
-- table; no production data migration is performed. Any orphan rows
-- are sacrificed.
--
-- Postgres drops the ix_vendor_gallery_images_vendor_position index
-- automatically when the table is dropped.

DROP TABLE IF EXISTS vendor_gallery_images;
