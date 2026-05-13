// V.2 backfill — populate vendor_members.avatar_url for existing
// rows by fetching the user from Clerk and copying image_url.
//
// One-shot, idempotent: re-running picks up any rows still NULL.
// Skips deleted (clerk_user_id starts with "deleted-") and synthetic
// demo rows ("demo_*"). Failures are logged + skipped — they don't
// abort the run.
//
// Usage: node scripts/backfill-avatar-urls.mjs
//
// Requires CLERK_SECRET_KEY in .env.local (already there for the
// webhook). Delete this file once Clerk Production is live and the
// webhook has fully repopulated the dev branch organically.

import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClerkClient } from "@clerk/backend";

const here = path.dirname(fileURLToPath(import.meta.url));
const envText = fs.readFileSync(path.join(here, "..", ".env.local"), "utf8");

function envLine(key) {
  const line = envText.split("\n").find((l) => l.startsWith(`${key}=`));
  if (!line) throw new Error(`${key} not set in .env.local`);
  return line.slice(`${key}=`.length).trim().replace(/^"|"$/g, "");
}

const dbUrl = envLine("DATABASE_URL_UNPOOLED");
const clerkKey = envLine("CLERK_SECRET_KEY");

const sql = postgres(dbUrl, { max: 1, prepare: false });
const clerk = createClerkClient({ secretKey: clerkKey });

let updated = 0;
let skipped = 0;
let failed = 0;

try {
  const rows = await sql`
    SELECT id, clerk_user_id, name
    FROM vendor_members
    WHERE avatar_url IS NULL
      AND clerk_user_id NOT LIKE 'deleted-%'
      AND clerk_user_id NOT LIKE 'demo_%'
    ORDER BY id
  `;
  console.log(`Found ${rows.length} rows to backfill.`);

  for (const row of rows) {
    try {
      const u = await clerk.users.getUser(row.clerk_user_id);
      const url = u.imageUrl ?? null;
      if (!url) {
        console.log(`  skip id=${row.id} ${row.name} (no imageUrl on Clerk user)`);
        skipped++;
        continue;
      }
      await sql`
        UPDATE vendor_members
          SET avatar_url = ${url}, updated_at = NOW()
        WHERE id = ${row.id} AND avatar_url IS NULL
      `;
      console.log(`  set  id=${row.id} ${row.name}`);
      updated++;
    } catch (err) {
      console.error(`  FAIL id=${row.id} ${row.name}:`, err?.message ?? err);
      failed++;
    }
  }

  console.log(
    `\nDone. updated=${updated} skipped=${skipped} failed=${failed}`,
  );
} finally {
  await sql.end();
}
