# Resolute Apps Directory — Project Brain

> Ground-truth brief for any AI/agent collaborator working in this repo. Read it first, every session.

## 1. Product

A **curated public directory** of project management & infrastructure tools, organised by project stage (Feasibility → Definition → Delivery → Operations → Post-Delivery → General). Used as a soft credibility tool by Resolute Management Consultancy and as a passive lead/reputation asset.

**Critical positioning:** This is a **directory, not a Resolute marketing site**. It must read like an independent reference (G2/Capterra tone), not a consultancy product page. Resolute appears only in: footer attribution line, About page paragraph, optional small wordmark in header. **No service pitches, no consulting CTAs, no lead-capture beyond "suggest an app" / general contact.**

Three audiences:
- **Visitors** (clients, prospects, public) — no auth, browse and click out to vendors.
- **Vendors** (app companies) — LinkedIn OAuth, submit and manage their listing.
- **Admins** (Resolute team) — email + password + 2FA, moderate everything.

Full requirements live in [docs/requirements.md](docs/requirements.md). When in doubt, that document is authoritative — this file summarises the load-bearing parts.

## 2. Stack

| Layer | Choice | Notes |
|------|--------|-------|
| Framework | Next.js 15 (App Router) | Server Components by default; SSG/ISR for public pages |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS | shadcn/ui primitives, customised |
| Auth | Clerk | LinkedIn OAuth for vendors; separate flow + 2FA for admins |
| ORM | Drizzle | |
| Database | Neon Postgres | full-text search via `tsvector` + GIN |
| File storage | Cloudflare R2 or Vercel Blob | logos, screenshots — pick one before phase 1 |
| Email | Resend | transactional only |
| Rich text | Tiptap | vendor description editor, sanitised allowlist |
| Analytics | Plausible | privacy-friendly, reduces cookie banner friction |
| Errors | Sentry | |
| Deploy | Vercel | hosting region: EU or UAE for compliance |

**Don't introduce new tech for this project.** This stack is reused from Altaris Lab and is production-proven. If a need arises that this stack doesn't cover, raise it before reaching for a new dependency.

## 3. Architectural Rules (load-bearing)

1. **Public pages must be statically generated where possible** (`/`, `/browse`, `/stages/[stage]`, `/capabilities/[capability]`, `/apps/[slug]`, landing pages). Use on-demand revalidation when an app is published or edited. SEO is the growth channel — server-rendered HTML is non-negotiable.
2. **Never query the database from a client component.** All DB access goes through server components, server actions, or route handlers.
3. **All server env access goes through `lib/env.ts`** (imports `server-only`). Never read `process.env.<SECRET>` directly outside that file. Public vars (`NEXT_PUBLIC_*`) are fine to read directly.
4. **Three role layers, two login URLs, one Clerk app.** Public routes are open. `/dashboard/**` requires an authenticated Clerk session (any role). `/admin/**` requires `publicMetadata.role === "admin"` AND `twoFactorEnabled === true`; missing role falls back to a DB lookup against `admins.clerk_user_id` so a vendor whose Clerk metadata sync hasn't propagated yet doesn't get locked out. **Vendors sign in at `/login` (LinkedIn OAuth only).** **Admins sign in at `/admin/login` (email + password + 2FA, hidden from public navigation, bookmark-only).** No public link points at `/admin/login` — see §6 Locked Decisions.
5. **Vendor email addresses are never rendered publicly.** "Contact this vendor" goes through a server-side form that emails via Resend. Anti-scrape is a hard requirement.
6. **External links (vendor websites) use `rel="nofollow noopener"` and `target="_blank"`.** This is both SEO hygiene and security.
7. **All vendor-submitted rich text is sanitised against a strict allowlist** (bold, italic, lists, links, paragraphs). No raw HTML, no `<script>`, no `<iframe>`, no inline styles. Use a server-side sanitiser before persisting — never trust the editor.
8. **All file uploads are MIME-checked, size-limited, and virus-scanned** before being served. Vendor logo upload requires alt text (accessibility + SEO).
9. **Filters are AND across categories, OR within a category.** Stage = (Delivery OR Operations) AND Capability = (Risk Management). URL state reflects all filters so results are shareable.
10. **Disclaimer on every app page:** "Listed for reference. Inclusion is not an endorsement by Resolute." This is non-negotiable legal cover.

## 4. Information Architecture

Six project stages (primary axis): Feasibility, Definition, Delivery, Operations, Post-Delivery, General. An app can belong to multiple.

Capability tags (secondary axis, ~22 of them): admin-managed. Vendors pick from existing list at submission. New capability requests go to admin queue — this prevents tag sprawl.

Pricing models, industries: see [docs/requirements.md §3.1](docs/requirements.md).

Site map: [docs/requirements.md §3.2](docs/requirements.md).

## 5. Phased Delivery

We ship in three phases. **Don't pull phase 2 work into phase 1 without an explicit ask.**

- **Phase 1 — MVP (4–6 weeks):** public browse + filters + app detail, 18 apps seeded by admin (no vendor login yet), admin panel for apps + taxonomy, basic SEO, suggest-an-app form. **Goal:** show the site to clients in meetings.
- **Phase 2 — Vendor self-service (3–4 weeks):** LinkedIn OAuth, vendor dashboard, multi-step submission, admin review queue, "claim this listing" flow.
- **Phase 3 — Polish & growth:** featured apps, related apps, advanced analytics, comparison tool, newsletter.

Out of scope for v1 (deliberately): user reviews/ratings, comparison tool, paid placements, multi-language, vendor messaging inbox, public API, mobile app. See [docs/requirements.md §14](docs/requirements.md). **Don't get talked into these in v1.**

## 6. Open Decisions (block kickoff)

These are unresolved per [requirements §15](docs/requirements.md). Do not assume answers — ask before designing around them:

1. Directory **name and domain**.
2. Visual brand direction (serious/corporate vs modern/approachable).
3. Geographic positioning (global vs MENA-focused vs both).
4. Exact wording of Resolute footer attribution.
5. Confirm the four showcase apps (suggested: Primavera P6, Procore, nPlan, Cognite).
6. Hosting region (Vercel global edge fine for compute; DB region matters for compliance).
7. Budget and timeline (in-house vs contractor vs agency).

### Locked decisions

Decisions previously open that are now committed. Don't relitigate.

- **Auth architecture (locked Stage 1, 2026-05-06).** One Clerk app, role-based separation via `publicMetadata.role`. Vendors at `/login` (LinkedIn OAuth only). Admins at `/admin/login` (email + password + 2FA enforced, no public link, admins bookmark the URL). Webhook handler at `/api/webhooks/clerk` is the source-of-truth gateway: it inserts the DB row first, then best-effort syncs role back to Clerk metadata. Middleware checks `publicMetadata.role` first, falls back to a DB lookup on `admins.clerk_user_id` if the claim is missing. Hosting region for Neon: Frankfurt (`eu-central-1`).
- **Test database strategy (locked Stage 1, 2026-05-06).** Vitest with a transaction-rollback fixture (`tests/setup/db-tx.ts`) against the seeded Neon dev branch. The fixture flattens nested `db.transaction()` calls to a pass-through during tests because postgres.js doesn't auto-savepoint nested transactions. Hard-fail safety rail: tests refuse to run if `NODE_ENV=production` or `DATABASE_URL_UNPOOLED` host isn't `*.neon.tech`.
- **2026-05-06 — Scope narrowed. Directory is invitation-only.** Removed:
  - Public suggest-an-app form (`/suggest`).
  - Generic contact form (`/contact`). Per-vendor "Contact this vendor" form at `/apps/[slug]/contact` is unaffected — that's the `contact_messages` flow.
  - Vendor claim-an-existing-listing flow (`/dashboard/onboarding/claim` + `components/dashboard/claim-search.tsx`).

  Only Resolute-team can add new tool listings via the admin panel. Vendor self-service from Stage 4 onwards is for vendors submitting NEW tools that the team has invited them to claim. The `submission_type` enum keeps the `'claim'` value for historical / seed rows but no production writer may emit it; the `suggestions` table is similarly retained but unused. Don't rebuild the removed surfaces without an explicit decision reversal.

## 7. SEO Contract (load-bearing)

This site lives or dies on organic traffic. Every page touches SEO:

- Server-rendered or statically generated HTML on all public pages.
- Per-page meta title + description (admin-editable on app pages, auto-generated with override).
- Open Graph + Twitter card tags.
- JSON-LD structured data: `SoftwareApplication` on app detail, `BreadcrumbList`, `Organization` on root.
- XML sitemap auto-generated and submitted to Google Search Console.
- `robots.txt` allows public pages, **disallows `/dashboard/**` and `/admin/**`**.
- Canonical URLs on every page.
- Clean slug-based URLs, never database IDs.
- Stage and capability landing pages exist primarily to rank for "[capability] software" queries — their intro copy is the SEO surface, treat it accordingly.

## 8. Security & Privacy

Hard rules, see [docs/requirements.md §8.6 / §8.7](docs/requirements.md):

- HTTPS only, HSTS on.
- OAuth state + PKCE.
- CSRF on all forms.
- Rate limiting on submission endpoints (suggest-an-app, contact-vendor, vendor signup).
- Admin actions audit-logged to `audit_log` table.
- Secrets in environment variables, never committed.
- GDPR-compliant cookie consent — analytics only loads after consent.
- DSAR process (data export/delete on request) must be operable from admin panel.
- Hosting region EU or UAE.

## 9. Database Schema (high-level)

Full schema in [docs/requirements.md §11](docs/requirements.md). Core tables:

`apps`, `stages`, `capabilities`, `industries`, `pricing_models`, plus M2M join tables (`app_stages`, `app_capabilities`, `app_industries`, `app_pricing_models`), `app_screenshots`, `vendors`, `admins`, `submissions` (review queue), `app_views` (rolled up daily), `outbound_clicks`, `contact_messages`, `suggestions`, `audit_log`.

Full-text search: Postgres `tsvector` + GIN index on `apps`. Don't reach for Elasticsearch / Algolia until it actually breaks.

## 10. Dev Server Restart Protocol

Restart Next.js dev after edits to:
- `next.config.js`
- `tailwind.config.ts`
- `postcss.config.js`
- `drizzle.config.ts`
- `.env.local` / any env var
- `middleware.ts`

Hot reload covers everything else.

## 11. File Structure (target)

Generated by `create-next-app`, then organised toward this shape:

```
resolute-directory/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                     # /
│   │   ├── browse/page.tsx
│   │   ├── stages/[stage]/page.tsx
│   │   ├── capabilities/[capability]/page.tsx
│   │   ├── apps/[slug]/page.tsx
│   │   ├── about/page.tsx
│   │   ├── suggest/page.tsx
│   │   └── contact/page.tsx
│   ├── (vendor)/
│   │   ├── login/page.tsx
│   │   └── dashboard/...                # vendor area, auth-gated
│   ├── (admin)/
│   │   └── admin/...                    # admin area, separate auth + 2FA
│   ├── api/
│   │   ├── webhooks/clerk/route.ts
│   │   ├── contact/route.ts             # vendor contact forwarding
│   │   └── suggest/route.ts
│   ├── legal/{terms,privacy,vendor-terms,cookies}/page.tsx
│   ├── sitemap.ts
│   ├── robots.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── directory/                       # product-specific (filter bar, app card, etc.)
│   └── ui/                              # shadcn primitives (customised)
├── lib/
│   ├── auth/                            # vendor + admin guards
│   ├── db/
│   │   ├── client.ts
│   │   ├── migrations/
│   │   └── schema.ts
│   ├── search/                          # tsvector query builder, filter logic
│   ├── seo/                             # metadata helpers, JSON-LD generators
│   ├── email/                           # Resend templates + senders
│   ├── env.ts                           # server-only env access
│   └── utils.ts
├── scripts/
│   └── seed-apps.ts                     # seeds 18 starter apps from CSV
├── docs/
│   └── requirements.md                  # source-of-truth requirements doc
├── public/
├── .env.example
├── CLAUDE.md  ←  you are here
├── PROGRESS.md
├── README.md
└── SECURITY.md
```

## 12. Design Contract

- Decision pending (see §6). Until brand direction lands, prototype in a neutral light theme — do not invest in visual polish.
- Mobile-first responsive. Filter sidebar on desktop, drawer on mobile. Touch targets ≥ 44px.
- WCAG 2.1 AA target. Semantic HTML, alt text on all images, keyboard nav, sufficient contrast.
- Lighthouse score 90+ on key pages. LCP < 2.5s on 4G.
- Numbers in cards (founded year, app counts) use tabular-nums for column alignment.

## 13. What NOT to do

- Don't tilt the site's voice toward Resolute marketing. It's a directory.
- Don't add user reviews, ratings, or a comparison tool in v1.
- Don't add Google Analytics / GA4 — Plausible is the chosen tool, partly to avoid cookie-banner friction.
- Don't reveal vendor email addresses anywhere in HTML or API responses.
- Don't accept rich text from vendors without server-side sanitisation.
- Don't introduce new dependencies casually — the stack is intentionally narrow.
- Don't merge phase 2 features into phase 1 without an explicit ask.
- Don't skip SEO chores ("we'll add metadata later") — by the time you remember, Google has indexed the bad version.
