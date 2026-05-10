# AllInfratech — Project Brain

> Ground-truth brief for any AI/agent collaborator working in this repo. Read it first, every session.

## 1. Product

A **curated public directory** of project management & infrastructure tools, organised by project stage (General → Feasibility → Definition → Delivery → Operations → Post-Delivery). Used as a soft credibility tool by Resolute Management Consultancy and as a passive lead/reputation asset.

**Public name:** AllInfratech. **Domain:** `allinfratech.com` (registered through Bluehost; nameservers migrated to Cloudflare for the UAE-accessibility fix).

**Tagline (locked):** *"A repository of infrastructure technology products and companies."*

**Critical positioning:** This is a **directory, not a Resolute marketing site**. It must read like an independent reference (G2/Capterra tone), not a consultancy product page. Resolute appears only in the footer attribution line and the About page. **No service pitches, no consulting CTAs.**

**Scope is invitation-only** (locked 2026-05-06): only the Resolute team adds new tool listings via the admin panel. There is no public "suggest an app" form and no vendor "claim an existing listing" flow. Vendor self-service is reserved for vendors invited to claim a vendor profile against a NEW tool listing.

Two audiences:
- **Visitors** (clients, prospects, public) — no auth, browse and click out to vendors.
- **Vendors** (app companies) — LinkedIn OAuth, submit and manage their listing once invited.
- **Admins** (Resolute team) — email + password + 2FA, moderate everything. (Admin auth still mocked at time of writing — ships in Stage 5.)

Full requirements live in [docs/requirements.md](docs/requirements.md). When in doubt, that document is authoritative — this file summarises the load-bearing parts.

## 2. Stack

| Layer | Choice | Notes |
|------|--------|-------|
| Framework | Next.js 15 (App Router) | Server Components by default; SSG/ISR for public pages; functions pinned to `fra1` (Frankfurt) — same DC as Neon, fewer cross-Atlantic round-trips |
| Language | TypeScript (strict) | tsc must stay clean at every commit |
| Styling | Tailwind CSS v4 | `@theme` palette tokens (canvas, ink, night, magenta, coral). Bespoke components — no shadcn/ui yet |
| Fonts | Alike (heading) + Pavanam (body) | via `next/font/google`, exposed as `--font-alike` / `--font-pavanam` |
| Auth | Clerk v7 | LinkedIn OAuth for vendors via `@clerk/nextjs/legacy` `useSignIn().authenticateWithRedirect`. Signal-based hooks (the new default) don't expose the OAuth-redirect API. Admin path stays mocked until Stage 5 |
| ORM | Drizzle | migrations in `drizzle/`, journal at `drizzle/meta/_journal.json`. `npm run db:migrate` |
| Database | Neon Postgres | full-text search via `tsvector` + GIN; region: `eu-central-1` (Frankfurt) |
| File storage | **Vercel Blob** (decision changed Phase D.4 2026-05-09 — was Cloudflare R2) | Store name `allinfratech-uploads`, region FRA1 (Frankfurt — closest to MENA), public access (URLs are unguessable random strings). Chose Vercel Blob over R2 to avoid Cloudflare's card-on-file requirement. Free-tier limits: 1 GB storage + 1 GB bandwidth/month — monitor and migrate to R2 if approached. **Stage 4 Phase C must use the `@vercel/blob` SDK, NOT `@aws-sdk/client-s3` as originally specced.** Env: `BLOB_READ_WRITE_TOKEN` (auto-set by Vercel; scoped to Production + Preview + Development) |
| Email | Resend | transactional only. Domain `allinfratech.com` verified Phase D.3 2026-05-09 (region us-east-1, 4 DNS records: DKIM TXT, SPF MX, SPF TXT, DMARC TXT); FROM = `AllInfratech Directory <directory@allinfratech.com>` |
| Email templates | React Email | `lib/email/templates/*.tsx`, server-side `render()` to HTML at send time |
| Rich text | Tiptap | vendor description editor, sanitised allowlist (not yet wired) |
| Validation | Zod | request bodies on every API route; `lib/env.ts` env parsing |
| Analytics | Plausible | privacy-friendly, reduces cookie banner friction (not yet wired) |
| Errors | Sentry | env scaffolded, not yet wired |
| Deploy | Vercel | hosting region: Frankfurt for compute (`fra1`), Cloudflare in front of the apex for UAE accessibility + global edge caching |

**Don't introduce new tech for this project.** This stack is reused from Altaris Lab and is production-proven. If a need arises that this stack doesn't cover, raise it before reaching for a new dependency. Already-installed deps include `resend`, `@react-email/components`, `@react-email/render`, `svix` (Clerk webhook signing).

## 3. Architectural Rules (load-bearing)

1. **Public pages must be statically generated where possible** (`/`, `/stages/[stage]`, `/capabilities/[capability]`, `/apps/[slug]`, `/vendors/[slug]`). Use `revalidate` on each page. SEO is the growth channel — server-rendered HTML is non-negotiable.
2. **Never query the database from a client component.** All DB access goes through server components, server actions, or route handlers.
3. **All server env access goes through `lib/env.ts`** (imports `server-only`). Never read `process.env.<SECRET>` directly outside that file. Public vars (`NEXT_PUBLIC_*`) are fine to read directly.
4. **Three role layers, two login URLs, one Clerk app.** Public routes are open. `/dashboard/**` requires an authenticated Clerk session (any role). `/admin/**` requires `publicMetadata.role === "admin"` AND `twoFactorEnabled === true`; missing role falls back to a DB lookup against `admins.clerk_user_id`. **Vendors sign in at `/login` (LinkedIn OAuth only).** **Admins sign in at `/admin/login` (email + password + 2FA, hidden from public navigation, bookmark-only).** No public link points at `/admin/login`.
5. **Vendor email addresses are never rendered publicly.** "Contact this vendor" goes through a server-side form at `/apps/[slug]/contact` that emails via Resend. Anti-scrape is a hard requirement.
6. **External links (vendor websites) use `rel="nofollow noopener"` and `target="_blank"`.** SEO hygiene + security.
7. **All vendor-submitted rich text is sanitised against a strict allowlist** (bold, italic, lists, links, paragraphs). No raw HTML, no `<script>`, no `<iframe>`, no inline styles. Server-side sanitiser before persist — never trust the editor.
8. **All file uploads are MIME-checked, size-limited, and virus-scanned** before being served. Vendor logo upload requires alt text (a11y + SEO).
9. **Filters are AND across categories, OR within a category.** Stage = (Delivery OR Operations) AND Capability = (Risk Management). URL state reflects all filters so results are shareable.
10. **Disclaimer on every app page:** *"Listed for reference. Inclusion is not an endorsement by Resolute."* Non-negotiable legal cover.
11. **Sort is always alphabetical.** Sort tabs were retired in the Stage 2.5 design refresh. `searchApps()` always orders by `name ASC`. The `apps.featured` column stays in the schema but no production reader / writer touches it.
12. **The `vendors` table is the company; `vendor_members` is the human.** A Clerk session resolves to a `vendor_members` row whose `vendor_id` may be NULL until onboarding completes. Multiple humans can represent the same company. See §9.

## 4. Information Architecture

Six project stages (primary axis), display order locked 2026-05-07 (General leads):

| `position` | slug | Display |
|---|---|---|
| 0 | `general` | 01 General |
| 1 | `feasibility` | 02 Feasibility |
| 2 | `definition` | 03 Definition |
| 3 | `delivery` | 04 Delivery |
| 4 | `operations` | 05 Operations |
| 5 | `post-delivery` | 06 Post-Delivery |

An app can belong to multiple stages.

Capability tags (~22 of them): admin-managed. New capability requests go to admin queue — prevents tag sprawl.

**Pricing models** (locked 2026-05-07, replaced from the Stage 1 list):
- `user-subscription-freemium` — User Subscription / Freemium
- `pay-per-use` — Pay-per-use
- `licensed-by-project` — Licensed by Project
- `licensed-by-company-portfolio` — Licensed by Company/Portfolio size
- `service-contract` — Service Contract

Industries: Construction, Infrastructure, Energy, Real Estate, Manufacturing, General.

Site map (current — `/suggest` + `/contact` removed in scope narrowing):

```
/                              Home (filter sidebar + cards, search, stage chip row)
/stages/[stage]                Stage landing
/capabilities/[capability]     Capability landing
/apps/[slug]                   App detail
/apps/[slug]/contact           Per-vendor inquiry form (the only public form that sends mail)
/vendors/[slug]                Vendor profile
/about                         About + #contact section with Resolute info
/legal/{terms,privacy,vendor-terms,cookies}
/login                         Vendor login (LinkedIn OAuth, redirects signed-in users to /dashboard)
/sso-callback                  Clerk OAuth handshake completion
/dashboard/**                  Vendor area (Clerk-gated; onboarded gate via getVendorSession)
/dashboard/onboarding          Confirm-company step (B.2 wires the form)
/dashboard/onboarding/submit   Submit a new product (3-step wizard)
/dashboard/messages/[id]       Inquiry inbox detail (Stage 6)
/admin/**                      Admin area (separate auth + 2FA — Stage 5)
```

## 5. Phased Delivery — current status

| Phase | Status | What's in it |
|---|---|---|
| **Stage 1 — Foundations** | ✅ done | Schema, seed, Clerk auth scaffolding, middleware, transaction-rollback test fixture |
| **Stage 2 — Public surface** | ✅ done | `searchApps`/`getFilterFacets`, prefix tsquery, click + view tracking, search-input race-condition fix, narrow search scope to name+vendor |
| **Stage 2.5 — Design + scope cleanup** | ✅ done | Removed `/suggest`, `/contact`, claim flow; renamed to InfratechDatabase then AllInfratech; footer restructured; sort tabs retired; stages reordered (General first); pricing models replaced |
| **Stage 3 — Vendor inquiry email pipeline** | ✅ done | `/api/contact-vendor` with Zod, IP rate limit, honeypot; Resend client + `lib/email/from.ts` + two templates; vendor inquiry forwards via Resend with Reply-To = visitor email + BCC = internal inbox |
| **Stage 4 — Vendor self-service** | 🟡 in progress | Phase A done (real Clerk session, lazy-create fallback, signed-in handling); Phase B.1 done (vendors → vendors + vendor_members schema split); B.2 next (legal acceptance + onboarding wiring) |
| **Stage 5 — Admin** | ⬜ not started | Real admin auth (email + password + 2FA), submission review queue, taxonomy management |
| **Stage 6 — Vendor inbox + analytics** | ⬜ not started | Inbox detail view; per-app view + click metrics; vendor dashboard reads |
| **Stage 7 — Polish & growth** | ⬜ deferred | Featured re-introduction (if desired), distributed rate limiting, performance review, comparison tool |

**Phase D — production switch** (parallel to Stage 4):
- D.0 ✅ site rename (2026-05-08)
- D.1 ✅ Vercel apex `allinfratech.com` live with SSL (2026-05-09). Apex A `@ → 216.198.79.1` (Vercel project IP). www subdomain deferred — not added in Vercel, no CNAME. **Issue surfaced + fix:** SSL HTTP-01 challenge cycled "Generating SSL → Invalid Configuration" repeatedly. Fix that worked: remove domain → wait full 30 s → re-add. Rapid re-add did NOT work; the pause matters.
- D.1.5 ✅ Cloudflare DNS migration (2026-05-09 — new sub-phase, not in original plan). Reason: UAE ISPs (Etisalat / du) block Vercel's apex IP `216.198.79.1` directly, so the bare Vercel setup was unreachable from UAE without VPN. Bluehost stays the registrar; nameservers swapped to `huxley.ns.cloudflare.com` + `kehlani.ns.cloudflare.com`. Cloudflare SSL/TLS mode: Full (strict). Apex A is **Proxied** (orange cloud); all Resend records are **DNS only** (grey cloud — mail can't go through HTTP proxy). UAE access verified working without VPN.
- D.2 🔒 Blocked — Clerk Production + LinkedIn Developer Portal pending Resolute LinkedIn account access from boss.
- D.3 ✅ Resend domain verified (2026-05-09). Domain `allinfratech.com`, region `us-east-1` (North Virginia). 4 DNS records added (DKIM TXT, SPF MX, SPF TXT, DMARC TXT). Status: ready to send.
- D.4 ✅ Vercel Blob storage (2026-05-09 — **decision changed from Cloudflare R2**). Store `allinfratech-uploads`, region FRA1, public access. Reason: avoid Cloudflare's card-on-file requirement on the R2 free tier. Free-tier limits 1 GB storage + 1 GB bandwidth/month — TODO set Vercel bandwidth spend alert before Stage 4 launch.
- D.5 ⏳ Final smoke test (deferred until D.2 lands — needs real Clerk + LinkedIn flow end-to-end).

Out of scope for v1 (deliberately): user reviews/ratings, comparison tool, paid placements, multi-language, vendor messaging inbox (one-way only), public API, mobile app. **Don't get talked into these in v1.**

## 6. Open Decisions

These are unresolved. Do not assume answers — ask before designing around them:

1. **Showcase apps** for Stage 5 admin "Editor's pick" — `apps.featured` stays in the schema unread. Re-introducing the concept needs a UX call (where does it surface? how do admins manage it?).
2. **Hosting region for compliance**: Vercel functions on `fra1` (Frankfurt), DB on `eu-central-1` (Frankfurt) — but the Cloudflare layer doesn't have a regional pin. Confirm acceptable for UAE / EU client compliance.
3. **Budget and timeline** (in-house vs contractor vs agency) — affects the pace of Stages 5–7.

### Locked decisions

Decisions previously open that are now committed. Don't relitigate.

- **Auth architecture (Stage 1, 2026-05-06).** One Clerk app, role-based separation via `publicMetadata.role`. Vendors at `/login` (LinkedIn OAuth only). Admins at `/admin/login` (separate flow, mocked until Stage 5). Webhook handler at `/api/webhooks/clerk` is the source-of-truth gateway.

- **Test database strategy (Stage 1, 2026-05-06).** Vitest with a transaction-rollback fixture (`tests/setup/db-tx.ts`) against the seeded Neon dev branch. The fixture flattens nested `db.transaction()` calls to a pass-through during tests. Hard-fail safety rail: tests refuse to run if `NODE_ENV=production` or `DATABASE_URL_UNPOOLED` host isn't `*.neon.tech`.

- **Scope narrowed — directory is invitation-only (2026-05-06).** Removed: public suggest-an-app form (`/suggest`), generic contact form (`/contact`, but per-vendor `/apps/[slug]/contact` stays), vendor claim-an-existing-listing flow. The `submission_type` enum keeps `'claim'` for historical rows but no production writer emits it; `suggestions` table similarly retained but unused.

- **Brand identity (2026-05-06 → revised 2026-05-08).** Public name `AllInfratech` (final). Tagline "A repository of infrastructure technology products and companies." Wordmark in italic Alike. Black masthead bar retired in favour of inline tagline under the wordmark in the header. Pink/orange (`--color-magenta` `--color-coral`) on dark canvas as accent palette; light canvas as primary.

- **Footer (2026-05-08).** Three-column structure (Vendors / Legal / About) plus a single bottom bar with the Resolute "R" logo + one-line attribution. Resolute Management Consultancy links to `https://resolutemanagementconsultancy.com/`. No `/suggest` link, no v0.1 marker.

- **Search scope and ordering (2026-05-06).** `searchApps` runs `to_tsquery` against name + denormalised `vendor_name` only (not tagline / description / capability names). Always alphabetical — sort tabs retired. Prefix `:* ` operator on tokens ≥ 2 chars to handle partial-word matching since the `tsvector` column is Porter-stemmed.

- **Stage display order (2026-05-07).** General leads, then lifecycle order (Feasibility → Post-Delivery). Migration `0004_reorder_stages_general_first.sql` updates `stages.position` per slug.

- **Pricing taxonomy (2026-05-07).** Replaced 7-row list with 5 (User Subscription / Freemium, Pay-per-use, Licensed by Project, Licensed by Company/Portfolio size, Service Contract). Migration `0005_replace_pricing_models.sql` drops + recreates; migration `0006_repopulate_pricing_tags.sql` re-tags the 15 seeded apps based on their real-world commercial model.

- **Vendor inquiry email pipeline (Stage 3, 2026-05-06).** `POST /api/contact-vendor` is the only public form that sends mail. Validates with Zod, honeypot field `website`, IP-keyed in-memory rate limit (5/hr/instance), DB row written before mail send, Resend send fired via `next/server.after()` so transient SMTP latency doesn't block the response. Vendor email FROM = `AllInfratech Directory`; Reply-To = visitor email; BCC = `EMAIL_CONTACT_INBOX`. **Distributed rate limiting deferred** — current limiter is per-instance, an attacker can hit different Vercel function instances. Stage 7 concern.

- **`requireOnboarded` defaults to true (Phase A, 2026-05-07).** Every dashboard page is assumed to need a fully onboarded vendor. The onboarding pages themselves (`/dashboard/onboarding`, `/dashboard/onboarding/submit`, `/dashboard/onboarding/complete`) MUST opt out with `requireOnboarded: false`. Strict default is deliberate — future dashboard subroutes can't accidentally skip the gate.

- **Lazy-create vendor_members fallback (Phase A, 2026-05-07).** When `getVendorSession()` finds an authenticated Clerk userId but no `vendor_members` row, it inserts one inline using `clerkClient().users.getUser(userId)` as the source of truth. Onboarding insert remains the canonical writer; lazy-create is the webhook-failure fallback. ON CONFLICT DO NOTHING on `clerk_user_id` so concurrent webhook can't deadlock.

- **`vendor_members` schema split (Phase B.1, 2026-05-08).** `vendors` no longer holds `clerk_user_id` or `onboarded` — those moved to a new `vendor_members` table. The split lets multiple Clerk users represent the same company. `vendor_id` on a member is nullable: at first sign-in we create the member row before the human has chosen which company they belong to. The `/dashboard/onboarding` step (B.2) inserts a vendors row and repoints `vendor_id` from NULL. GDPR delete anonymises the `vendor_members` row + suspends the vendor row only if the deleted human was the sole active member.

- **Production domain switch (Phase D, in progress 2026-05-08 → mostly landed 2026-05-09).** Site renamed end-to-end to `AllInfratech` including metadata + email surfaces. `allinfratech.com` live behind a Cloudflare proxy in front of Vercel — UAE TRA blocks Vercel's apex IP `216.198.79.1` directly at the TLS-SNI layer, so Cloudflare's edge IPs front everything (UAE access verified without VPN). DNS migrated from Bluehost to Cloudflare nameservers (`huxley.ns.cloudflare.com` + `kehlani.ns.cloudflare.com`); Bluehost stays the registrar. Cloudflare SSL mode = Full (strict). Apex A record proxied; Resend records DNS-only. **Resend domain verified + sending live** as of 2026-05-09. **Clerk Production + LinkedIn Developer Portal still blocked** on access from boss — Phase D.2. www subdomain deferred (not configured).

- **EMAIL_FROM finalized = `team@allinfratech.com` (2026-05-09).** Replaces the Stage 3 sandbox value `onboarding@resend.dev`. Resend domain verification for `allinfratech.com` (Phase D.3) covers any `*@allinfratech.com` sender, so the local-part can move freely without re-verifying. `lib/email/from.ts` wraps as `AllInfratech Directory <team@allinfratech.com>` (display name unchanged). `EMAIL_CONTACT_INBOX` stays `infratechdb@outlook.com` for now — branded inbox migration is tracked as tech debt in §14.

- **Onboarding = modal, not page (Phase B.2 PR 1, 2026-05-10).** First-sign-in legal acceptance is a blocking modal mounted in the dashboard layout (`components/onboarding/legal-acceptance-modal.tsx`), not a redirect to `/dashboard/onboarding`. The modal is legal-only — Terms/Vendor Terms/Privacy/Cookies acceptance — and POSTs to `/api/onboarding/confirm` which flips `vendor_members.onboarded` true and writes a row into `vendor_member_legal_acceptances` (audit trail with version + ip + ua). The previous `getVendorSession()` redirect for `!onboarded` was REMOVED so the layout SSR can mount the modal above any underlying page; the closed-shape `!vendor` redirect now points at `/dashboard/onboarding` (welcome) which initiates the company-info wizard. Cookie-banner is intentionally absent because the public site uses cookie-less Plausible analytics — see Cookie Policy §1. **Legal copy is v1.0, lawyer-review pending** (see §14). Re-acceptance flow on version bumps and `/api/submissions` wiring are deferred to PR 2 of Phase B.2.

- **File storage = Vercel Blob (Phase D.4, 2026-05-09).** Decision changed from the originally-spec'd Cloudflare R2. Reason: R2 requires a card on file even on the free tier; Vercel Blob is one-click on the existing Vercel account with no payment data required. Store `allinfratech-uploads`, region FRA1, public access (URLs are unguessable random strings; logos + screenshots are publicly viewable by design). **Stage 4 Phase C must use the `@vercel/blob` SDK, NOT the originally-spec'd `@aws-sdk/client-s3` (which was R2's S3-compatible interface).** Free-tier limits: 1 GB storage + 1 GB bandwidth/month — monitor and migrate to R2 if approached. TODO before Stage 4 launch: set Vercel bandwidth spend alert. Old `R2_*` env vars are deprecated and removed from this brain (see §13).
  **Migration trigger:** Migrate to Cloudflare R2 when Vercel Blob bandwidth approaches 800 MB/month (80% of 1 GB free tier) or when projected monthly cost exceeds $5, whichever comes first.

## 7. SEO Contract (load-bearing)

This site lives or dies on organic traffic. Every page touches SEO:

- Server-rendered or statically generated HTML on all public pages.
- Per-page meta title + description (admin-editable on app pages, auto-generated with override).
- Open Graph + Twitter card tags.
- JSON-LD structured data: `SoftwareApplication` on app detail, `BreadcrumbList`, `Organization` on root, custom block on vendor profile pages.
- XML sitemap auto-generated and submitted to Google Search Console (post-domain-switch).
- `robots.txt` allows public pages, **disallows `/dashboard/**` and `/admin/**`**.
- Canonical URLs on every page.
- Clean slug-based URLs, never database IDs.
- Stage and capability landing pages exist primarily to rank for "[capability] software" queries — their intro copy is the SEO surface, treat it accordingly.

## 8. Security & Privacy

Hard rules, see [docs/requirements.md §8.6 / §8.7](docs/requirements.md):

- HTTPS only, HSTS on (Cloudflare layer enforces; Vercel origin also serves valid Let's Encrypt cert under Full (Strict) SSL mode).
- OAuth state + PKCE (Clerk handles).
- CSRF on all forms.
- **Rate limiting on `POST /api/contact-vendor`** (Stage 3 — 5/hr per IP, in-memory). Distributed rate limiting deferred to Stage 7.
- **Honeypot field** on every public-facing form; non-empty → silent 200 + no DB/email writes.
- Admin actions audit-logged to `audit_log` table (Stage 5 will widen the surface).
- Webhook GDPR delete: `vendor_member.gdpr_delete` audit row + member anonymisation; sole-member edge case suspends the vendor row + unpublishes its apps.
- Secrets in environment variables, never committed.
- GDPR-compliant cookie consent — analytics only loads after consent (Plausible TBD).
- DSAR process (data export/delete on request) must be operable from admin panel (Stage 5).
- Hosting region EU (Frankfurt — Vercel `fra1`, Neon `eu-central-1`).

## 9. Database Schema (current — see also drizzle/0000…0009 migrations)

Core company/human tables:
- **`vendors`** — companies. id, slug, name, contact_email, short_blurb, description, website_url, linkedin_url, founded_year, employee_band, hq_country, hq_city, logo_url, suspended, claimed_at, created_at, updated_at. **No `clerk_user_id` and no `onboarded` columns** — those moved to `vendor_members` in Phase B.1.
- **`vendor_members`** (new in Phase B.1) — humans. id, vendor_id (nullable FK → vendors), clerk_user_id (UQ NOT NULL), name, primary_email NOT NULL, linkedin_url, role, onboarded, suspended, created_at, updated_at.
- `admins` — id, clerk_user_id, name, email, role, created_at, updated_at.

Catalogue:
- `apps` — id, slug, name, vendor_id, vendor_name (denormalised, trigger-maintained, drives `search_vector`), tagline, description, logo_url, website_url, founded_year, status, featured (column exists, unread post-Stage-2.5), search_vector (GENERATED tsvector — name weight A, vendor_name weight B), published_at, editor_note, …
- Taxonomy: `stages`, `capabilities`, `industries`, `pricing_models`, `regions`. Many-to-many joins: `app_stages`, `app_capabilities`, `app_industries`, `app_pricing_models`, `vendor_regions`.
- `app_screenshots`.

Workflow / inbox / analytics:
- `submissions` — review queue. Type enum is `('new', 'claim')` but `'claim'` is **deprecated 2026-05-06** — no production writer may emit it.
- `suggestions` — retained but **unused** post-scope-narrowing.
- `contact_messages` — visitor → vendor inquiries (Stage 3 source of truth for the email pipeline).
- `app_views` — daily rollup (UPSERT on (app_id, day)).
- `outbound_clicks` — per-row append.
- `audit_log`.

Pending tables (B.2):
- `vendor_member_legal_acceptances` — id, vendor_member_id, terms_version, accepted_at, ip_address, user_agent, created_at. Index on vendor_member_id.

Full-text search: Postgres `tsvector` + GIN index on `apps.search_vector`. **Search scope: name + vendor_name only** (not tagline / description / tag names — locked Stage 2.5). Don't reach for Elasticsearch / Algolia until it actually breaks.

## 10. Dev Server Restart Protocol

Restart Next.js dev after edits to:
- `next.config.ts`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `drizzle.config.ts`
- `.env.local` / any env var
- `middleware.ts`

Hot reload covers everything else.

## 11. File Structure (current — not target — what's actually on disk)

```
resolute-directory/
├── app/
│   ├── page.tsx                            # /
│   ├── stages/[stage]/page.tsx
│   ├── capabilities/[capability]/page.tsx
│   ├── apps/[slug]/page.tsx
│   ├── apps/[slug]/contact/page.tsx        # per-vendor contact form
│   ├── vendors/[slug]/page.tsx
│   ├── about/page.tsx                      # has #contact section
│   ├── legal/{terms,privacy,vendor-terms,cookies}/page.tsx
│   ├── login/page.tsx                      # session-aware: signed-in → /dashboard
│   ├── sso-callback/page.tsx               # Clerk OAuth-redirect handler
│   ├── dashboard/
│   │   ├── layout.tsx                      # uses DashboardHeader, not MainChrome
│   │   ├── page.tsx                        # overview
│   │   ├── onboarding/page.tsx             # confirm-company step
│   │   ├── onboarding/submit/page.tsx      # 3-step wizard
│   │   ├── onboarding/complete/page.tsx    # post-submit "thanks" stateless page
│   │   ├── messages/page.tsx               # inbox (Stage 6)
│   │   └── messages/[id]/page.tsx
│   ├── admin/
│   │   ├── layout.tsx                      # uses AdminHeader
│   │   ├── page.tsx
│   │   ├── apps/page.tsx
│   │   └── queue/page.tsx
│   ├── api/
│   │   ├── webhooks/clerk/route.ts         # signed; writes vendor_members
│   │   ├── contact-vendor/route.ts         # Stage 3 inquiry pipeline
│   │   ├── clicks/[appId]/route.ts         # 302 + after() DB write
│   │   └── views/[appId]/route.ts          # POST → upsert app_views
│   ├── sitemap.ts
│   ├── robots.ts
│   ├── layout.tsx                          # ClerkProvider, MainChrome wrapper
│   └── globals.css
├── components/
│   ├── auth/linkedin-sign-in-button.tsx    # useSignIn from @clerk/nextjs/legacy
│   ├── browse/                             # search bar, app card, filter sidebar, stage chip row
│   ├── home/index-page.tsx                 # the home composition
│   ├── site/                               # header, footer, container, contact-vendor-form
│   ├── dashboard/                          # dashboard chrome + submit wizard + uploads
│   └── admin/                              # admin chrome + queue list
├── lib/
│   ├── auth/
│   │   ├── session.ts                      # getVendorSession (overloaded, requireOnboarded default true)
│   │   ├── admin-session.ts                # mocked; Stage 5 work
│   │   └── middleware-decision.ts          # pure, unit-testable
│   ├── browse/filters.ts                   # parse/serialise URL state
│   ├── data/                               # static taxonomy + seed sources
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema/                         # split per concern
│   │   ├── seed.ts
│   │   └── migrate.ts
│   ├── email/
│   │   ├── client.ts                       # lazy Resend SDK init
│   │   ├── from.ts                         # FROM header builder ("AllInfratech Directory <…>")
│   │   ├── send-contact.ts                 # parallel allSettled vendor + visitor sends
│   │   ├── rate-limit.ts                   # in-memory IP bucket
│   │   └── templates/                      # React Email templates
│   ├── queries/                            # search / facets / apps / vendors / messages / tracking
│   ├── env.ts                              # eager core + lazy resend()/database()/clerk()/r2()/sentry()
│   └── utils.ts
├── drizzle/
│   ├── 0000_…sql … 0009_…sql               # migrations including the schema-split + drop columns
│   └── meta/_journal.json
├── tests/
│   ├── setup/{db-tx.ts,env.ts,jsdom.ts}
│   ├── api/{contact-vendor,tracking}.test.ts
│   ├── auth/vendor-session.test.ts
│   ├── components/search-bar.test.tsx      # jsdom env
│   ├── queries/{apps,facets,messages,search,submissions,taxonomy,vendors}.test.ts
│   └── webhook.test.ts
├── docs/
│   └── requirements.md                     # canonical spec (kept in sync with phase work)
├── public/
├── .env.example / .env.local
├── CLAUDE.md  ←  you are here
├── PROGRESS.md
├── README.md
├── SECURITY.md
└── BACKLOG.md
```

## 12. Design Contract

- **Brand locked.** AllInfratech wordmark in italic Alike. Tagline "A repository of infrastructure technology products and companies" inline under the wordmark. Pink/orange accents on dark canvas; light canvas (`--color-canvas`) as primary surface.
- **Mobile-first responsive.** Filter sidebar on desktop, drawer on mobile. Touch targets ≥ 44px.
- **Always alphabetical sort** on the home / search results — sort tabs retired Stage 2.5. Don't reintroduce.
- **WCAG 2.1 AA target.** Semantic HTML, alt text on all images, keyboard nav, sufficient contrast.
- **Lighthouse score 90+** on key pages. LCP < 2.5s on 4G.
- **Numbers in cards** (founded year, app counts) use tabular-nums for column alignment.
- **No design changes during data wiring.** Stages 4 onwards wire UI to real backends; visual tweaks happen in dedicated `design — …` commits, not tucked inside wiring commits.

## 13. What NOT to do

- Don't tilt the site's voice toward Resolute marketing. It's a directory.
- Don't reintroduce `/suggest` or `/contact` — they were retired in scope narrowing. Same for the vendor claim flow.
- Don't reintroduce sort tabs / featured-on-home — locked retired Stage 2.5.
- Don't rebuild widgets that read `apps.featured` — the column is dormant data.
- Don't query `vendors.clerk_user_id` or `vendors.onboarded` — those columns were dropped in Phase B.1.
- Don't add user reviews, ratings, or a comparison tool in v1.
- Don't add Google Analytics / GA4 — Plausible is the chosen tool.
- Don't reveal vendor email addresses anywhere in HTML or API responses.
- Don't accept rich text from vendors without server-side sanitisation.
- Don't introduce new dependencies casually — the stack is intentionally narrow.
- Don't merge later-stage features into the current stage without an explicit ask.
- Don't skip SEO chores ("we'll add metadata later") — by the time you remember, Google has indexed the bad version.
- Don't hardcode `infratech-wine.vercel.app` anywhere — production canonical is `allinfratech.com`.
- Don't use the new `useSignIn` hook from `@clerk/nextjs` for OAuth flows — the new Signal-based hook has no `authenticateWithRedirect`. Use `@clerk/nextjs/legacy`.
- Don't reach for `@aws-sdk/client-s3` — file storage moved from R2 to Vercel Blob in Phase D.4 (2026-05-09). Use `@vercel/blob`. The original Stage 4 spec said S3-compatible client; that spec is superseded.
- Don't proxy Resend DNS records through Cloudflare (orange cloud). Mail can't traverse an HTTP proxy — DKIM / SPF / MX / DMARC must be DNS-only (grey cloud). Same for any future MX or mail-related TXT records.
- Don't add a www CNAME without re-checking Vercel's domain config — www.allinfratech.com is intentionally not configured at the moment.

## 14. TODO / Tech Debt

Open follow-ups not blocking current work but worth tracking. Each entry: what + why deferred + trigger.

- **Branded inbox for `EMAIL_CONTACT_INBOX`.** Currently `infratechdb@outlook.com`. Migrate to `team@allinfratech.com` (or `contact@allinfratech.com`) when email hosting is set up. Requires Google Workspace, Zoho Mail, or similar + adding MX records at Cloudflare (DNS only, grey cloud — same constraint as Resend's records). **Out of scope for Phase D**; revisit during ops/branding cleanup.

- **Vercel Blob bandwidth alert.** Set a spend alert in Vercel project settings before Stage 4 Phase C launch. Free tier is 1 GB storage + 1 GB bandwidth/month; the locked migration trigger to R2 is at 800 MB/month or $5/month projected. The alert is what gives us early warning. Trigger: before Stage 4 Phase C ships uploads.

- **Distributed rate limiting** for `/api/contact-vendor`. Current limiter is per Vercel function instance (in-memory `Map`). Replace with Upstash Redis or Vercel KV before public launch. Cloudflare WAF in front (Phase D.1.5) is a partial mitigation. Trigger: Stage 7 (polish & growth) OR sooner if abuse measured.

- **DMARC tightening.** Currently `p=none` (observability mode). After ~1 week of clean DMARC reports from Resend's sending, tighten to `p=quarantine`, then `p=reject`. Trigger: post-launch, after a baseline of legit-mail reports.

- **Lawyer review of v1.0 legal copy.** Terms of Service, Vendor Terms, Privacy Policy, and Cookie Policy were drafted in-house and shipped in Phase B.2 PR 1 (2026-05-10) with `TERMS_VERSION = "2026-05-10"`. AED 500 liability cap, DIFC-LCIA arbitration seat in Dubai, English language, single arbitrator. Review needed before opening signups beyond the pilot vendor cohort. On material change, bump `lib/legal/terms-version.ts` — the modal's 409 response forces clients to refetch and re-accept. **Out of scope for the modal-launch PR**; trigger: before non-pilot vendors are invited.

- **Cookie consent banner.** Currently no banner because the public site sets zero cookies (Plausible is cookie-less by design); strictly-necessary auth cookies inside `/dashboard/**` and `/admin/**` fall under the standard ePrivacy carve-out. If Stage 7 introduces any non-strictly-necessary cookie (advertising pixel, third-party analytics, etc.), add a banner BEFORE those cookies fire and update `/legal/cookies` accordingly. Trigger: any future tooling that requires consent-bearing cookies.

- **Pre-existing test failures (surfaced during Phase B.2 PR 1, 2026-05-10).** Full `npx vitest run` shows 9 failures unrelated to PR 1: `tests/queries/taxonomy.test.ts` (×2 — expects `feasibility` first / 7 pricing models, but seed has `general` first since migration `0004` and 5 pricing models since `0005`); `tests/webhook.test.ts` (×5 — postgres.js connection errors during query execution, possibly Neon dev-branch pooling); `tests/queries/messages.test.ts` (×2 — message-state assertions failing). Triage and fix in a dedicated cleanup PR BEFORE PR 2 lands so the suite is trustworthy as the next round of changes goes in. Trigger: before opening PR 2 of Phase B.2.

- **LinkedIn OAuth product approval** (Phase D.2 prerequisite). Once Resolute LinkedIn account is shared, register the LinkedIn Developer Portal app and request "Sign in with LinkedIn using OpenID Connect" (1–72 h LinkedIn review). Then the Clerk dev → prod switch can land. Trigger: boss provides Resolute LinkedIn access.
