# AllInfratech

A curated public directory of project management & infrastructure tools, organised by project stage. Maintained by the Digital & AI Practice of Resolute Management Consultancy.

**Public site:** [allinfratech.com](https://allinfratech.com) (Phase D production-domain switch in progress; falls back to `infratech-wine.vercel.app` until Cloudflare proxy lands).

> **Repo / folder names** still say `resolute-directory` / `Infratech` (working names). The public brand is **AllInfratech** — file/folder/repo renames are mechanical churn with zero user value, so they stay.

## Documents

- [CLAUDE.md](CLAUDE.md) — project brain. Read first.
- [docs/requirements.md](docs/requirements.md) — full requirements (kept in sync with phase work).
- [PROGRESS.md](PROGRESS.md) — what's done, what's in flight.
- [SECURITY.md](SECURITY.md) — security model and incident response.
- [BACKLOG.md](BACKLOG.md) — deferred items + hard prerequisites before launch.

## Local dev

The repo is fully scaffolded — clone, install, fill env, migrate, seed, run.

```bash
# 1. Install
npm install

# 2. Env
cp .env.example .env.local
# Fill in: DATABASE_URL + DATABASE_URL_UNPOOLED (Neon),
#          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY +
#          CLERK_WEBHOOK_SIGNING_SECRET,
#          NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login,
#          NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login,
#          NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard,
#          NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/onboarding,
#          NEXT_PUBLIC_SITE_URL=http://localhost:3000,
#          RESEND_API_KEY + EMAIL_FROM + EMAIL_CONTACT_INBOX,
#          R2_* keys.
# Set NEXT_PUBLIC_DEMO_MODE=true for fast local iteration without
# real Clerk; set false to exercise the real auth path.

# 3. Migrations (idempotent; safe to re-run)
npm run db:migrate

# 4. Seed (15 vendors, 15 apps, taxonomy, demo admin)
npm run db:seed

# 5. Dev
npm run dev
```

Default dev port: `3000`. The dev server reloads on most file edits but **not** on env / `next.config.ts` / `tailwind.config.ts` / `middleware.ts` changes — restart manually for those (CLAUDE.md §10).

## Testing

```bash
# Run the full suite (~6 min — Neon EU TLS handshake per test)
npm test

# Targeted file
npx vitest run tests/auth/vendor-session.test.ts

# Coverage
npm run test:coverage
```

The suite uses a **transaction-rollback fixture** against the Neon dev branch — every test opens a tx, runs, rolls back, so seed data stays clean. The fixture refuses to run if `NODE_ENV=production` or `DATABASE_URL_UNPOOLED` host isn't `*.neon.tech`. Vitest config splits projects into `node` (most tests) and `jsdom` (UI tests like `tests/components/search-bar.test.tsx`).

## Drizzle / DB workflows

```bash
# Generate a new migration after schema edits
npx drizzle-kit generate --custom --name <description>

# Apply pending migrations
npm run db:migrate

# Drizzle Studio (browse + edit DB rows in a web UI)
npm run db:studio
```

Migration files live in `drizzle/`. The journal at `drizzle/meta/_journal.json` tracks which have been applied — Drizzle's migrator reads it as the source of truth, so new SQL files **must** be appended there with the next `idx`.

Current migration list:
- `0000_stale_sentinel` — initial schema
- `0001_set_updated_at` — `set_updated_at()` trigger function + per-table triggers
- `0002_neat_scorpion` — taxonomy seed
- `0003_narrow_search_to_name_vendor` — denormalised `apps.vendor_name` + tsvector rebuild + sync triggers
- `0004_reorder_stages_general_first` — Phase 2.5 stage display order
- `0005_replace_pricing_models` — Phase 2.5 pricing taxonomy replace
- `0006_repopulate_pricing_tags` — Phase 2.5 retag the 15 seeded apps
- `0007_add_vendor_members` — Phase B.1 schema split
- `0008_backfill_vendor_members` — Phase B.1 backfill
- `0009_drop_vendors_clerk_user_id_and_onboarded` — Phase B.1 column drop

## Deployment

Vercel project `infratech` deploys from the `main` branch. Production domain `allinfratech.com` (Phase D.1 in progress — Cloudflare proxy front-end fixes UAE TLS-SNI block on Vercel's newer apex IP). Functions pinned to `fra1` (Frankfurt) via `vercel.json` to colocate with Neon's `eu-central-1` region.

Env vars must be set on Vercel in **both Production and Preview scopes** to match. Don't enable `NEXT_PUBLIC_DEMO_MODE=true` on Production — `lib/env.ts` auto-disables it via `!isProd`, but explicit `false` is clearer.

## Phase status

See [PROGRESS.md](PROGRESS.md) for the full milestone log. At a glance:

- **Stage 1 (Foundations)**, **Stage 2 (Public surface + search)**, **Stage 2.5 (Design + scope cleanup)**, **Stage 3 (Vendor inquiry email pipeline)** — ✅ done
- **Stage 4 — Vendor self-service** — 🟡 Phase A done (real Clerk auth), Phase B.1 done (vendors / vendor_members schema split), B.2 next
- **Phase D — Production domain switch** — 🟡 site renamed, custom domain claimed, Cloudflare proxy planned to fix UAE TLS-SNI block
- **Stages 5 (Admin), 6 (Inbox + analytics), 7 (Polish & growth)** — ⬜ not started
