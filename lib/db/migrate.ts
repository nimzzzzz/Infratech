/* eslint-disable no-console */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "@/lib/env";

/**
 * Run pending migrations. Uses the unpooled connection because the migrator
 * runs prepared statements inside a long transaction the Neon pooler can't
 * service reliably.
 *
 * Invoke via `npm run db:migrate`. Idempotent — Drizzle's __drizzle_migrations
 * tracking table records what's been applied.
 */
async function main() {
  const url = env.database().DATABASE_URL_UNPOOLED;
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Running migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
