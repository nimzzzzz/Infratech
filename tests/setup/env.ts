import { config } from "dotenv";
import { vi } from "vitest";

// Load .env.local before anything else evaluates env vars. Setup files run
// before each test file, so the env is available to every imported module.
config({ path: ".env.local" });

// `revalidatePath` (and friends) require Next.js's per-request static-
// generation store, which doesn't exist in a bare vitest runtime. Route
// handlers that call it throw "Invariant: static generation store
// missing in revalidatePath /path" and the success path returns 500.
// No-op the cache helpers so the route can return its real 200 and
// tests can assert on the persisted payload.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <T>(fn: T) => fn,
}));

// Hard safety rails — never run tests against prod data, never against
// an unknown (non-Neon) database.
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "Refusing to run tests with NODE_ENV=production. Tests issue real DB writes inside transactions; a misrouted connection in prod would be ruinous.",
  );
}

const dbUrl = process.env.DATABASE_URL_UNPOOLED;
if (!dbUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is required for tests. Set it in .env.local.",
  );
}
if (!dbUrl.includes("neon.tech")) {
  throw new Error(
    `Refusing to run tests against non-Neon DB (got URL host: ${new URL(dbUrl).host}). Tests assume the seeded Neon dev branch.`,
  );
}
