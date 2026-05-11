# Progress

Living log of what's done, what's in flight, and what's next. Update at the end of every working session.

## Status: Phase B.1 done; Phase D mostly landed (D.2 blocked, D.5 deferred)

Public site shipped through Stage 3 (vendor inquiry email pipeline). Stage 4 underway — Phase A (real Clerk auth) and Phase B.1 (vendors / vendor_members schema split) both landed. Production-domain switch (Phase D) is now live for everything except Clerk Production: `allinfratech.com` is reachable globally (UAE-included via Cloudflare proxy), Resend domain verified and sending, Vercel Blob storage provisioned. Only D.2 (Clerk Prod + LinkedIn Developer Portal) remains blocked on access from boss.

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

### Phase B.2 — onboarding wiring + legal acceptance 🟡 PR 1 done, PR 2 next

**PR 1 — Onboarding modal + legal acceptance + legal pages ✅ done (2026-05-10)**
- [x] `vendor_member_legal_acceptances` table (migration `0011`, hand-written after drizzle-kit auto-gen tried to redo every prior migration)
- [x] `lib/legal/terms-version.ts` constant (`TERMS_VERSION = "2026-05-10"`)
- [x] Four legal pages with full v1.0 content — Terms of Service, Vendor Terms, Privacy Policy, Cookie Policy. AED 500 liability cap, DIFC-LCIA arbitration, single arbitrator, English. Lawyer review tracked in CLAUDE.md §14.
- [x] `lib/rate-limit/vendor-member.ts` — per-instance in-memory limiter keyed on `vendor_member.id` (5/hr), mirrors `lib/email/rate-limit.ts` pattern
- [x] `POST /api/onboarding/confirm` — Zod (in `app/api/onboarding/confirm/schema.ts` so route.ts only exports POST), honeypot `website2`, idempotent on `onboarded=true`, version-mismatch 409, transaction over `vendor_members.onboarded` flip + audit row insert
- [x] `components/onboarding/legal-acceptance-modal.tsx` — blocking client modal, sign-out via `useClerk().signOut`, body-scroll lock, sr-only honeypot, `router.refresh()` on success
- [x] Wired into `app/dashboard/layout.tsx` — open-shape session, real `unreadCount` from `countUnreadForVendor(vendor.id)` replacing the hardcoded `0`, modal mounted below `<main>`
- [x] `lib/auth/session.ts` — removed `!onboarded` redirect (modal handles this); closed-shape `!vendor` retargeted to `/dashboard/onboarding` (welcome) so the wizard can pick up
- [x] Tests: 19 new (Zod unit × 3, rate-limit util × 3, integration happy path, auth/lookup × 4, body validation × 3, honeypot, rate-limit through HTTP, modal renders/doesn't × 3); all pass; 14 vendor-session tests still green

**PR 2 — Vendor row creation + wizard wire-up ✅ done (2026-05-11)**
- [x] `POST /api/submissions` — Zod (sibling `schema.ts`), honeypot `website3`, vendor-member rate limit, transaction: optional INSERT vendors + INSERT submissions
- [x] Server-side slug generation + uniqueness check on `apps.slug` AND `vendors.slug` → 409 `slug_taken`
- [x] Re-acceptance gate: 409 `version_mismatch` if member's latest acceptance is older than `TERMS_VERSION`
- [x] Wired `components/dashboard/submit-wizard.tsx` `handleSubmit` to real API; loading state, inline 4xx error rendering, network-error retry copy
- [x] Re-acceptance UI in `legal-acceptance-modal.tsx` (new `needsReacceptance` prop; layout reads `getLatestAcceptedVersion()` and triggers the modal in re-accept mode; sign-out button hidden in re-accept mode)
- [x] `/api/onboarding/confirm` idempotency lifted from "member.onboarded === true" → per-version check; re-acceptance writes an additive audit row
- [x] Removed Guard 3 (`!vendor` redirect at `submit/page.tsx:49`); fixed stale `skipCompanyStep` heuristic (`vendorMember.onboarded` → `vendor != null`)
- [x] Dashboard Guard 2 replaced with empty-state component (`DashboardEmptyState`) — renders welcome/pending-review state instead of redirecting away
- [x] `/dashboard/onboarding/submitted` confirmation page (personalised with product name + primary email); legacy `/dashboard/onboarding/complete` deleted
- [x] Logo uploads: rendered as "Logo uploads are coming soon" notice in the wizard pending Phase C
- [x] Tests: 12 new on `/api/submissions`, 1 new on `/api/onboarding/confirm` re-acceptance, 6 on `lib/legal/check-acceptance`, 2 wizard render smokes; all pass

**PR 2 follow-ups deferred to later phases:**
- Vendor logo uploads (Phase C — Vercel Blob)
- End-to-end browser test for the wizard submit flow (when Playwright/Cypress lands)
- Lawyer review of v1.0 legal copy (CLAUDE.md §14)

### Phase C — file uploads to Vercel Blob ⬜ later
**Storage choice changed in Phase D.4 (2026-05-09): Vercel Blob, not R2.** Use the `@vercel/blob` SDK, NOT `@aws-sdk/client-s3` as the original spec said.
- [ ] Install `@vercel/blob`
- [ ] `/api/uploads/sign` endpoint (Vercel Blob client uploads work differently from S3 presigned URLs — likely uses `handleUpload` server action or `put()` from server)
- [ ] Wire `components/dashboard/logo-upload.tsx` + `gallery-upload.tsx` to the Blob store `allinfratech-uploads`
- [ ] Enforce logo upload constraints from BACKLOG (square, ≥256×256, ≤2MB, alt text)

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

## Phase D — production switch (parallel to Stage 4) 🟡 mostly landed

- [x] **D.0** — Site rename `InfratechDatabase` / `InfraTechDB` → `AllInfratech` across 13 files (header, dashboard chrome, admin chrome, login, onboarding h1, layout SITE_NAME, page metadata, vendor pages openGraph + JSON-LD, email templates, FROM display name, mock messages). Locked 2026-05-08.
- [x] **D.1** — Vercel apex domain (2026-05-09). `allinfratech.com` live with SSL. Apex A `@ → 216.198.79.1` (Vercel project IP). www subdomain deferred (not added; no CNAME). **Issue + fix:** SSL HTTP-01 challenge cycled "Generating SSL → Invalid Configuration" repeatedly; remove → wait full 30s → re-add worked.
- [x] **D.1.5** — Cloudflare DNS migration (2026-05-09 — new sub-phase, not in original plan). Bluehost stays the registrar; nameservers swapped to `huxley.ns.cloudflare.com` + `kehlani.ns.cloudflare.com`. Cloudflare SSL/TLS = Full (strict). Apex A is Proxied (orange cloud); all Resend records are DNS only (grey cloud — mail can't proxy). UAE access verified working without VPN. Reason: Vercel's apex IP `216.198.79.1` was blocked by UAE ISPs (Etisalat / du) at the TLS-SNI layer.
- [🔒] **D.2** — Clerk Production. Blocked on Resolute LinkedIn Developer Portal account access from boss. Once unblocked: register LinkedIn app, request "Sign in with LinkedIn using OpenID Connect" product (1–72 h LinkedIn review), switch Clerk dev → prod, swap pk_test_/sk_test_ → pk_live_/sk_live_ on Vercel, point webhook at `https://allinfratech.com/api/webhooks/clerk`.
- [x] **D.3** — Resend domain verified (2026-05-09). Domain `allinfratech.com`, region `us-east-1` (North Virginia). 4 DNS records added: DKIM TXT, SPF MX, SPF TXT, DMARC TXT. Status: ready to send. ✅ **EMAIL_FROM = `team@allinfratech.com` finalized 2026-05-09** (was using sandbox `onboarding@resend.dev`); Vercel env updated + redeployed. Display name stays "AllInfratech Directory". Follow-up: `EMAIL_CONTACT_INBOX` is still the personal `infratechdb@outlook.com` — branded-inbox migration is tracked under TODO / Tech Debt in CLAUDE.md §14.
- [x] **D.4** — File storage: **Vercel Blob** (decision changed from R2). Store `allinfratech-uploads`, region FRA1, public access. `BLOB_READ_WRITE_TOKEN` auto-set on Vercel for Production + Preview + Development. **Stage 4 Phase C must use `@vercel/blob` SDK, not `@aws-sdk/client-s3`.** Free-tier limits: 1 GB storage + 1 GB bandwidth/month — TODO set Vercel bandwidth spend alert before Stage 4 launch; migrate to R2 if approached.
- [⏳] **D.5** — Final smoke test. Deferred until D.2 lands — needs the real Clerk + LinkedIn flow end-to-end.

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
