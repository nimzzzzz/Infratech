// Apply migration 0017 to the dev branch. Idempotent: ADD COLUMN
// IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT
// EXISTS. Safe to re-run.
//
// Phase C PR 1 — apps.video_url + vendor_gallery_images.
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
  await sql`ALTER TABLE apps ADD COLUMN IF NOT EXISTS video_url TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS vendor_gallery_images (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      alt TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS ix_vendor_gallery_images_vendor_position
      ON vendor_gallery_images (vendor_id, position)
  `;
  console.log("0017 applied.");
} finally {
  await sql.end();
}
