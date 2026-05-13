// Apply migration 0015 to the dev branch. Idempotent: CREATE TABLE
// IF NOT EXISTS. Safe to re-run.
//
// TEMP DEBUG (debug/avatar-url-payload-to-db) — delete after the
// avatar-url payload shape is confirmed and V.2 is fixed.
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const envText = fs.readFileSync(path.join(here, "..", ".env.local"), "utf8");
const line = envText
  .split("\n")
  .find((l) => l.startsWith("DATABASE_URL_UNPOOLED="));
const url = line.slice("DATABASE_URL_UNPOOLED=".length).trim().replace(/^"|"$/g, "");

const sql = postgres(url, { max: 1, prepare: false });
try {
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_debug_log (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      clerk_user_id TEXT,
      payload_snapshot JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("0015 applied.");
} finally {
  await sql.end();
}
