// Apply migration 0016 to the dev branch. Idempotent: DROP TABLE
// IF EXISTS. Safe to re-run.
//
// Run AFTER fix/v2-avatars-fetch-at-signin is merged + deployed,
// so the now-removed INSERT into webhook_debug_log isn't still in
// flight against a dropped table. Same sequencing note applies on
// prod: deploy first, drop second.
//
// Delete this file (along with scripts/apply-0014.mjs) once the
// dev + prod DBs are both confirmed in sync with the migrations
// journal.
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
  await sql`DROP TABLE IF EXISTS webhook_debug_log`;
  console.log("0016 applied.");
} finally {
  await sql.end();
}
