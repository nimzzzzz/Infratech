import { z } from "zod";

/**
 * Centralised env access. Two patterns:
 *
 *   • `env.SITE_URL`, `env.DEMO_MODE` — parsed eagerly at module load. Boot
 *     fails loudly if anything required-at-boot is missing or malformed.
 *
 *   • `env.database()`, `env.clerk()`, `env.resend()`, `env.r2()`,
 *     `env.sentry()` — lazy accessors. The schema is parsed on first call
 *     so a missing Resend key (Stage 3+) doesn't crash a page that only
 *     reads from the DB.
 *
 * Public NEXT_PUBLIC_* vars are read directly from `process.env` (the
 * Next.js compiler statically inlines them), but we still validate them
 * here so a missing one fails the test suite, not the visitor.
 */

const isProd = process.env.NODE_ENV === "production";

// ── Eager: required at boot ───────────────────────────────────────────────
const coreSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SEARCH_FUZZY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const core = coreSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  SEARCH_FUZZY: process.env.SEARCH_FUZZY,
});

// ── Lazy schemas ──────────────────────────────────────────────────────────
const databaseSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),
});

const clerkSchema = z
  .object({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
  })
  .transform((v) => ({
    publishableKey: v.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: v.CLERK_SECRET_KEY,
    webhookSigningSecret: v.CLERK_WEBHOOK_SIGNING_SECRET,
  }));

const resendSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  EMAIL_CONTACT_INBOX: z.string().email(),
  EMAIL_REPLY_TO: z.string().email().optional(),
});

const r2Schema = z.object({
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
});

const sentrySchema = z.object({
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});

const secretsSchema = z.object({
  INTERNAL_API_SECRET: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(16).optional(),
});

const parseLazy = <T>(schema: z.ZodType<T>, group: string): (() => T) => {
  let cached: T | null = null;
  return () => {
    if (cached) return cached;
    const result = schema.safeParse(process.env);
    if (!result.success) {
      const missing = result.error.issues
        .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(
        `Missing or invalid env vars for "${group}":\n${missing}`,
      );
    }
    cached = result.data;
    return cached;
  };
};

// ── Public API ────────────────────────────────────────────────────────────
export const env = {
  SITE_URL: core.NEXT_PUBLIC_SITE_URL,
  /** Demo-mode toggles (?as=new etc.) — auto-disabled in production. */
  DEMO_MODE: !isProd && core.NEXT_PUBLIC_DEMO_MODE,
  SEARCH_FUZZY: core.SEARCH_FUZZY,
  IS_PROD: isProd,

  database: parseLazy(databaseSchema, "database"),
  clerk: parseLazy(clerkSchema, "clerk"),
  resend: parseLazy(resendSchema, "resend"),
  r2: parseLazy(r2Schema, "r2"),
  sentry: parseLazy(sentrySchema, "sentry"),
  secrets: parseLazy(secretsSchema, "secrets"),

  plausible: () => ({
    domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || undefined,
    host: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || undefined,
  }),
};
