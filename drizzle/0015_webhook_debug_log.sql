-- TEMP DEBUG (debug/avatar-url-payload-to-db) — Vercel runtime logs
-- aren't surfacing webhook POST entries, so the console.info trace
-- from migration 0014's follow-up branch produces nothing visible.
-- Pivoting the diagnostic to the database: every user.updated event
-- writes a row here with a snapshot of image-shaped payload fields.
--
-- After we capture the real payload shape and fix V.2, this table
-- and migration get reverted on a follow-up branch (down statement
-- below). Idempotent: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS webhook_debug_log (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  clerk_user_id TEXT,
  payload_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Down (manual revert): DROP TABLE IF EXISTS webhook_debug_log;
