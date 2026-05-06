-- Reorder the stages chip row: General now leads, the rest follow the
-- project lifecycle. Updates `position` only — slugs, ids, and every
-- relation in app_stages stay intact. listStages() orders by position
-- so this is the one place every reader picks up the new order.
--
-- Idempotent: each row is matched by slug, so re-running the file is
-- safe (it just re-asserts the same positions).

UPDATE stages SET position = 0 WHERE slug = 'general';
--> statement-breakpoint
UPDATE stages SET position = 1 WHERE slug = 'feasibility';
--> statement-breakpoint
UPDATE stages SET position = 2 WHERE slug = 'definition';
--> statement-breakpoint
UPDATE stages SET position = 3 WHERE slug = 'delivery';
--> statement-breakpoint
UPDATE stages SET position = 4 WHERE slug = 'operations';
--> statement-breakpoint
UPDATE stages SET position = 5 WHERE slug = 'post-delivery';
