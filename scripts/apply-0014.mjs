// Apply migration 0014 to the dev branch. Idempotent: ADD COLUMN
// guarded by IF NOT EXISTS. Safe to re-run. Delete after V.2 lands.
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
  await sql`ALTER TABLE vendor_members ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
  console.log("0014 applied.");
} finally {
  await sql.end();
}
