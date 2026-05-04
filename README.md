# Resolute Apps Directory

Curated public directory of project management & infrastructure tools, organised by project stage. Maintained by Resolute Management Consultancy.

> **Working folder name only.** The public directory name and domain are still an open decision (see [CLAUDE.md §6](CLAUDE.md)).

## Documents

- [CLAUDE.md](CLAUDE.md) — project brain. Read first.
- [docs/requirements.md](docs/requirements.md) — full requirements (authoritative).
- [PROGRESS.md](PROGRESS.md) — what's done, what's next.
- [SECURITY.md](SECURITY.md) — security model and incident response.

## Bootstrap

The repo is currently scaffolding-only (docs + env template). To initialise the Next.js app in this folder:

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*"
```

Then add core dependencies (per [CLAUDE.md §2](CLAUDE.md)):

```bash
npm install drizzle-orm @neondatabase/serverless @clerk/nextjs zod resend
npm install -D drizzle-kit
```

shadcn/ui, Tiptap, Plausible, Sentry come in as needed — don't preinstall everything.

## Local dev

1. Copy env template:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in Neon, Clerk, Resend keys.
3. Run migrations:
   ```bash
   npx drizzle-kit push
   ```
4. Seed the 18 starter apps:
   ```bash
   npm run seed
   ```
5. Start dev:
   ```bash
   npm run dev
   ```

## Phases

- **Phase 1 — MVP**: public browse, app detail, admin panel, 18 seeded apps.
- **Phase 2 — Vendor self-service**: LinkedIn OAuth, dashboard, submission flow, review queue.
- **Phase 3 — Polish & growth**: featured apps, advanced analytics, comparison tool.

Detail in [CLAUDE.md §5](CLAUDE.md).
