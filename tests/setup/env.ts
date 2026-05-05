import { config } from "dotenv";

// Load .env.local before anything else evaluates env vars. Setup files run
// before each test file, so the env is available to every imported module.
config({ path: ".env.local" });

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
