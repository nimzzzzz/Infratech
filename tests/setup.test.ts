import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getTestDb } from "./setup/db-tx";

/**
 * Smoke tests for the transaction fixture itself. If these fail, no
 * other test will work.
 */

describe("transaction fixture", () => {
  it("getTestDb returns a working Drizzle client", async () => {
    const tx = getTestDb();
    const result = await tx.execute<{ ok: number }>(sql`SELECT 1 as ok`);
    expect(result[0]?.ok).toBe(1);
  });

  it("the production `db` import is mocked to point at the test tx", async () => {
    // db.execute should hit the same connection as getTestDb()
    const result = await db.execute<{ ok: number }>(sql`SELECT 1 as ok`);
    expect(result[0]?.ok).toBe(1);
  });

  it("seed data is visible inside the transaction", async () => {
    const result = await db.execute<{ count: string | number }>(
      sql`SELECT COUNT(*) AS count FROM stages`,
    );
    const count = Number(result[0]?.count);
    expect(count).toBe(6);
  });

  it("writes inside the test do NOT persist (rollback works)", async () => {
    // Insert, verify visible inside this tx
    await db.execute(
      sql`INSERT INTO stages (slug, name, position) VALUES ('z-rollback-probe', 'Probe', 99)`,
    );
    const r = await db.execute<{ count: string | number }>(
      sql`SELECT COUNT(*) AS count FROM stages WHERE slug = 'z-rollback-probe'`,
    );
    expect(Number(r[0]?.count)).toBe(1);
    // afterEach will roll back; the next test (or this one re-run) won't see it
  });

  it("the previous test's insert was rolled back", async () => {
    const r = await db.execute<{ count: string | number }>(
      sql`SELECT COUNT(*) AS count FROM stages WHERE slug = 'z-rollback-probe'`,
    );
    expect(Number(r[0]?.count)).toBe(0);
  });
});
