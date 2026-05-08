# Progress

Living log of what's done, what's in flight, and what's next. Update at the end of every working session.

## Status: Phase B.1 done, Phase D in progress

Public site shipped through Stage 3 (vendor inquiry email pipeline). Stage 4 underway — Phase A (real Clerk auth) and Phase B.1 (vendors / vendor_members schema split) both landed. Production-domain switch (Phase D) running in parallel: site renamed end-to-end to **AllInfratech**, custom domain `allinfratech.com` claimed in Vercel, Cloudflare proxy planned to fix UAE TLS-SNI block.

## Brand decisions (closed)

- [x] **Public name:** AllInfratech (final, locked 2026-05-08)
- [x] **Domain:** `allinfratech.com` (registered through Bluehost, DNS migrating to Cloudflare)
- [x] **Tagline:** "A repository of infrastructure technology products and companies"
- [x] **Visual direction:** italic Alike (heading) + Pavanam (body), pink/orange (`--color-magenta` / `--color-coral`) accents on light canvas; dark night surface for footer; hero image as full-bleed background
- [x] **Footer:** three-column (Vendors / Legal / About) + Resolute "R" logo + one-line attribution at the bottom
- [x] **Resolute attribution wording:** "A community service of the Digital & AI Practice of Resolute Management Consultancy. © {year}. All product and company names belong to their respective owners." Linked to `https://resolutemanagementconsultancy.com/`.
- [x] **Showcase apps:** all 15 seeded apps carry full descriptions; no "featured" UI in v1

## Open decisions

- [ ] Hosting region final compliance call (currently `fra1` Vercel + `eu-central-1` Neon — confirm acceptable for UAE / EU client base)
- [ ] Re-introduce featured-app surface? (`apps.featured` column is dormant; locked-retired Stage 2.5)
- [ ] Budget + pacing for Stages 5–7

## Stage 1 — Foundations ✅ done

- [x] Next.js 15 + TS strict + Tailwind v4 scaffold
- [x] Drizzle schema (`apps`, `stages`, `capabilities`, `industries`, `pricing_models`, M2M joins, `vendors`, `admins`, `submissions`, `suggestions`, `app_views`, `outbound_clicks`, `contact_messages`, `audit_log`)
- [x] Neon connection + first migration applied (`drizzle/0000_…`)
- [x] Seed script: 15 vendors, 15 apps, taxonomy, demo admin (`lib/db/seed.ts`)
- [x] Clerk auth scaffold + middleware (`middleware.ts` + pure `lib/auth/middleware-decision.ts`)
- [x] Clerk webhook handler (`/api/webhooks/clerk`) — svix signature verification + role sync to publicMetadata
- [x] Vitest with transaction-rollback fixture (`tests/setup/db-tx.ts`)
- [x] SEO basics: metadata, robots.ts, sitemap.ts, canonical URLs
- [x] Public routes: `/`, `/apps/[slug]`, `/stages/[stage]`, `/capabilities/[capability]`, `/vendors/[slug]`, `/about`, all legal

## Stage 2 — Public surface ✅ done

- [x] `searchApps` with prefix `tsquery` for partial-word matching
- [x] `getFilterFacets` with own-axis exclusion
- [x] Click + view tracking endpoints (`/api/clicks/[appId]`, `/api/views/[appId]`) using Next 15 `after()` for non-blocking DB writes
- [x] Search-input race-condition fix (echo guard, composition handling, debounce)
- [x] Search scope narrowed to name + denormalised vendor_name (migration `0003_narrow_search_to_name_vendor.sql` — triggers maintain `vendors.name` → `apps.vendor_name`)
- [x] Function region pinned to `fra1` (Frankfurt, same DC as Neon)
- [x] Parallelised sequential query waterfalls in search + apps queries
- [x] Targeted test coverage: `searchApps`, `getFilterFacets`, click + view tracking, search-bar component (jsdom)

## Stage 2.5 — Design + scope cleanup ✅ done

- [x] Removed `/contact`, `/suggest`, `/dashboard/onboarding/claim` (scope narrowing locked 2026-05-06)
- [x] Renamed brand → InfratechDatabase (then again to AllInfratech in Phase D.0)
- [x] Footer restructured: top R-logo block + tagline + bottom copyright + v0.1 collapsed into single bottom bar with R logo + one-line attribution
- [x] Three-column footer (Vendors / Legal / About) replaces old four-column with Directory/Suggest entries
- [x] Sort tabs retired (`SortTabs` component deleted, `?sort=` URL parser + `sort` arg on `searchApps` removed). Always alphabetical
- [x] `apps.featured` removed from `AppCard` type + projection + admin "featured count" line + app-detail "Editor's pick" badge. Column kept in DB as dormant data
- [x] Stage display order: General leads (migration `0004`)
- [x] Pricing model taxonomy replaced (5 entries — migrations `0005` + `0006`)
- [x] ⌘K shortcut + visible badge removed from search input
- [x] EDITION 01 · The Index eyebrow removed from /login caption
- [x] Add /about#contact section with Resolute info

## Stage 3 — Vendor inquiry email pipeline ✅ done

- [x] `resend` + `@react-email/components` + `@react-email/render` installed
- [x] `lib/email/client.ts` (lazy Resend init) + `lib/email/from.ts` (FROM header builder)
- [x] React Email templates: `vendor-inquiry.tsx` + `visitor-confirmation.tsx`
- [x] `lib/email/rate-limit.ts` — IP-keyed in-memory limiter (5/hr/instance)
- [x] `lib/email/send-contact.ts` — parallel `Promise.allSettled` for vendor + visitor sends
- [x] `POST /api/contact-vendor` — Zod validation, honeypot (`website` field), rate limit, DB row first then `after()` mail send
- [x] `lib/queries/messages.ts` — `getAppContactContext` + `recordContactMessage` joined the existing inbox queries
- [x] Form wired (`components/site/contact-vendor-form.tsx`) — field-level error states, top banner errors for 400/404/429/503
- [x] Tests: 14 cases covering happy path, validation, lookup failures, honeypot, rate limit, email-failure tolerance

## Stage 4 — Vendor self-service 🟡 in progress

### Phase A — real Clerk on /dashboard ✅ done
- [x] Replaced dead `lib/auth/mock-session.ts`
- [x] LinkedIn sign-in button wired to `signIn.authenticateWithRedirect` (Clerk v7 quirk: must import from `@clerk/nextjs/legacy`)
- [x] `/sso-callback` page renders `<AuthenticateWithRedirectCallback />`
- [x] Lazy-create vendor row from Clerk user object when webhook didn't deliver
- [x] `requireOnboarded` defaults to `true`; opt-out only on the onboarding pages themselves
- [x] Signed-in case handled across `/login` (server redirect to `/dashboard`), button (router.push instead of OAuth), header (`useUser` toggles Login/Dashboard CTA)

### Phase B.1 — schema split ✅ done
- [x] `vendor_members` table added (migration `0007`)
- [x] Existing `vendors.clerk_user_id` rows backfilled to `vendor_members` (migration `0008`)
- [x] `getVendorSession()` overloaded — closed shape (vendor non-null) when `requireOnboarded`, open shape (vendor nullable) when not
- [x] Webhook handler creates `vendor_members` instead of `vendors`; GDPR delete anonymises member, suspends vendor only if sole active member
- [x] `vendors.clerk_user_id` and `vendors.onboarded` dropped (migration `0009`)
- [x] Tests rewritten: 14 vendor-session cases (real Clerk path × 4, onboarded gate × 3, error paths × 3, lazy-create × 2, DEMO_MODE × 5) + queries/vendors join-shape

### Phase B.2 — onboarding wiring + legal acceptance ⬜ next
- [ ] `vendor_member_legal_acceptances` table
- [ ] `lib/legal/terms-version.ts` constant
- [ ] Confirm-company API endpoint (Zod, INSERT vendors + UPDATE vendor_member.vendor_id + INSERT acceptance)
- [ ] Wire `/dashboard/onboarding/page.tsx` form to API + legal checkbox (full visible block)
- [ ] Tests: onboarding + legal acceptance coverage

### Phase C — file uploads to R2 ⬜ later
- [ ] Install `@aws-sdk/client-s3`
- [ ] `/api/uploads/sign` presigned URL endpoint
- [ ] Wire `components/dashboard/logo-upload.tsx` + `gallery-upload.tsx` to R2

### Phase D — submission wizard wired to DB ⬜ later
- [ ] `POST /api/submissions` with validation + honeypot + rate limit
- [ ] Wire 3-step wizard submit handler

### Phase E — vendor dashboard reads ⬜ later
- [ ] `listVendorSubmissions`, `listVendorApps`, `countVendorUnreadMessages`
- [ ] Dashboard reads from real queries

## Stage 5 — Admin ⬜ not started
Real admin auth (email + password + 2FA), submission review queue, taxonomy management, content management, vendor management.

## Stage 6 — Vendor inbox + analytics ⬜ not started
Inbox detail view, per-app view + click metrics, vendor dashboard reads.

## Stage 7 — Polish & growth ⬜ deferred
Distributed rate limiting (Redis/Upstash) replacing the per-instance in-memory limiter, performance review, comparison tool (only if 50+ apps).

## Phase D — production switch (parallel to Stage 4) 🟡 in progress

- [x] **D.0** — Site rename `InfratechDatabase` / `InfraTechDB` → `AllInfratech` across 13 files (header, dashboard chrome, admin chrome, login, onboarding h1, layout SITE_NAME, page metadata, vendor pages openGraph + JSON-LD, email templates, FROM display name, mock messages)
- [🟡] **D.1** — Vercel custom domain. `allinfratech.com` resolves and serves, but UAE blocks the new Vercel anycast IP `216.198.79.1` at the TLS-SNI layer. Resolution: Cloudflare proxy in front. DNS to migrate Bluehost → Cloudflare nameservers; A record proxied (orange cloud), Resend records DNS-only (grey cloud).
- [⬜] **D.2** — Clerk Production instance. Blocked on LinkedIn Developer Portal "Sign in with LinkedIn using OpenID Connect" product review (1–72 h SLA).
- [🟡] **D.3** — Resend domain verification. Records added in Bluehost (will migrate to Cloudflare in D.1). Awaiting Resend verification status.
- [⬜] **D.4** — R2 bucket custom subdomain `assets.allinfratech.com`. Will simplify post-Cloudflare migration.
- [⬜] **D.5** — Final smoke test on production.

## Out of scope for v1 (deliberately)

User reviews/ratings, comparison tool, paid placements, multi-language, vendor messaging inbox (one-way only — replies via email, not in-app threading), public API, mobile app. See [docs/requirements.md §14](docs/requirements.md). **Don't get talked into these.**

## Content production (parallel track)

- [x] Brand identity (name, palette, type, hero image)
- [x] 15 app listings seeded with descriptions
- [x] About page copy
- [x] About page contact section
- [ ] Stage landing intros (6 × ~150 words) — placeholder content
- [ ] Capability landing intros (~22 × ~100 words) — placeholder content
- [ ] Legal pages drafted with counsel: terms, privacy, vendor terms, cookies
- [x] Email templates: vendor-inquiry + visitor-confirmation (Stage 3)
- [ ] Email templates pending: vendor welcome, submission received, changes requested, approved, rejected
- [ ] Onboarding legal-acceptance text (Phase B.2 — text already drafted in spec)
