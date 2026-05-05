import { beforeEach, afterEach, vi } from "vitest";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

/**
 * Transaction-per-test fixture.
 *
 * Each test opens a fresh connection, BEGINs a transaction, and binds a
 * Drizzle client to it. The production `db` import is mocked so query
 * code transparently uses the test transaction. The afterEach ROLLBACKs,
 * so seed data stays untouched and tests are fully isolated.
 *
 * The mock uses a Proxy whose getter dereferences the per-test `testDb`
 * binding at access time — that's how `db` can swap between tests
 * despite vi.mock factories running once at module load.
 *
 * Methods are bound to testDb so Drizzle's internal `this` references
 * land on the real client, not the proxy.
 */

let sql: ReturnType<typeof postgres> | null = null;
let testDb: PostgresJsDatabase<typeof schema> | null = null;

// Test environment is not the React module graph, so the "server-only"
// guard in query / auth modules throws on import. Mock it to a no-op in
// tests while keeping the real fence in production builds.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/db/client", () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        if (!testDb) {
          throw new Error(
            `[db-tx] db.${String(prop)} accessed before beforeEach ran`,
          );
        }
        // CRITICAL: postgres.js doesn't auto-savepoint nested transactions —
        // a db.transaction(...) inside our test BEGIN issues an inner
        // BEGIN/COMMIT that commits BOTH transactions, defeating the
        // afterEach ROLLBACK. Replace transaction() with a flat
        // pass-through: the production code's atomic-write intent is
        // preserved (all writes happen serially against the test outer
        // tx) while no inner commit ever fires.
        if (prop === "transaction") {
          return async (
            callback: (
              tx: PostgresJsDatabase<typeof schema>,
            ) => Promise<unknown>,
          ) => callback(testDb!);
        }
        const value = (testDb as unknown as Record<string | symbol, unknown>)[
          prop
        ];
        return typeof value === "function" ? value.bind(testDb) : value;
      },
    },
  ),
}));

beforeEach(async () => {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED missing in test setup");
  sql = postgres(url, { max: 1, prepare: false });
  await sql.unsafe("BEGIN");
  testDb = drizzle(sql, { schema });
});

afterEach(async () => {
  if (sql) {
    try {
      await sql.unsafe("ROLLBACK");
    } catch {
      // Connection already broken — fine.
    }
    try {
      await sql.end();
    } catch {
      // Already ended — fine.
    }
  }
  sql = null;
  testDb = null;
});

export function getTestDb(): PostgresJsDatabase<typeof schema> {
  if (!testDb) {
    throw new Error("Test DB not initialized — beforeEach hasn't run");
  }
  return testDb;
}

export function getTestSql() {
  if (!sql) throw new Error("Test SQL not initialized");
  return sql;
}
