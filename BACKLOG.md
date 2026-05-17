# Backlog & Deferred Items

Things we deliberately put off so we can stay focused on the current build,
plus things that **must** be wired before specific milestones. **Re-read this
file before launching anything publicly.**

> Convention: each entry has **Why deferred**, **When to revisit**, and
> **Trigger** (the event that flips this from "later" to "now").

## ⚠️ Hard prerequisites before public launch

These cannot ship to a real audience without being addressed first.

### Contact-vendor form: spam protection — partially landed
- **Status (2026-05-06):** Stage 3 wired in-memory IP-keyed rate limit (5/hr/instance) at `lib/email/rate-limit.ts` + honeypot `website` field on the form. **Distributed rate limit deferred — current limiter is per Vercel function instance, not globally enforced.** A determined attacker can hit different instances.
- **Still needed before public launch:** distributed limiter (Upstash Redis or Vercel KV) replacing the Map-based bucket; Cloudflare Turnstile or hCaptcha challenge if abuse becomes measurable. The Cloudflare proxy now in front of the site (Phase D.1) is itself a baseline — Cloudflare's free WAF mitigates obvious bots before the request even reaches us.
- **Trigger:** Stage 7 (polish & growth) OR sooner if abuse is observed in production.
- Discussed: 2026-05-04, 2026-05-06.

### Vendor email server side — DONE (Stage 3)
- ✅ `/api/contact-vendor` route ships with Zod validation, IP rate limit, honeypot, parallel Resend sends (vendor inquiry + visitor confirmation), `contact_messages` row written before mail send. Reply-To = visitor email so vendor replies skip the directory entirely. BCC = `EMAIL_CONTACT_INBOX` for the internal Resolute team.
- Email FROM display name is "AllInfratech Directory"; transitions from `onboarding@resend.dev` (Stage 3 sandbox) to `directory@allinfratech.com` once Phase D.3 Resend domain verification completes.

### Logo upload constraints (Phase 4-C upload pipeline)
The favicon-sourced placeholder logos shipped 2026-05-09 (commit `1e83477`) surfaced the visual variance issues. To ensure the directory looks professional once vendors actually upload their own logos, the upload endpoint at `/api/uploads/sign` (Phase 4-C) must enforce:

- **Square aspect ratio.** Reject uploads where `width !== height`, OR auto-centre-crop server-side at upload time. Square mandate is non-negotiable for the card-grid to look clean — wordmarks in square slots letterbox poorly. Vendors needing to display a wordmark have the option to upload it as the *vendor* logo (rendered larger on `/vendors/[slug]`) while uploading a square mark for the *app* logo.
- **Minimum 256×256 resolution.** The 32×32 Oracle favicon currently in seed data scales to 64px slot pixelated and unprofessional. Reject smaller uploads with a clear error message ("logo must be at least 256×256 pixels — most company brand assets exceed this; check your press kit").
- **Maximum 2MB file size + PNG/SVG/JPG allowlist.** Already in CLAUDE.md §3 rule 8.
- **Required alt text** at upload time. Already specified in CLAUDE.md §3 rule 8 + §12.
- **Server-side SVG sanitisation** if SVG is allowed (strip `<script>`, inline event handlers, external references). Otherwise restrict uploads to raster only.
- **Optional brand colour field** so the card slot can take the company's brand colour as background, with the logo overlaid. Defers this — `bg-[var(--color-canvas-warm)]` is acceptable for v1, but worth revisiting if the all-cream-canvas grid feels monotone once real logos populate.

The current placeholder favicons (10 of 14 vendors) stay in `public/logos/vendors/` until Phase 4-C wires real uploads, at which point the `logo_url` column points at Vercel Blob-hosted assets (storage choice locked Phase D.4 2026-05-09 — was R2 in original spec) with the constraints above. Use `@vercel/blob`, not `@aws-sdk/client-s3`. The 4 fall-back-to-LetterAvatar vendors (rdash, buildroid-robotics, white-helmet-safety, bridge2ai) demonstrate the day-1 mixed state, which is fine as long as letter avatars look polished — they do.

Discussed: 2026-05-09. Trigger: Phase 4-C kickoff.

### Phase A.1.2 — 2FA setup page for admins
- **Status (2026-05-12):** middleware 2FA enforcement is **temporarily bypassed** behind `ENFORCE_ADMIN_2FA` env flag (default off). The check at `lib/auth/middleware-decision.ts` lives in code, just gated. Admins currently sign in with LinkedIn only, no second factor. This is acceptable for the pilot admin cohort (3 operators, all internal) but **not for public launch**.
- **Scope when picked up:**
  - Build a real `/admin/2fa-setup` page using Clerk's TOTP flow. Admins enroll on first sign-in if no second factor is registered; subsequent sign-ins require the TOTP code at Clerk's hosted prompt.
  - Wire Clerk's `useReverification` / `userHasTwoFactor` (or equivalent in `@clerk/nextjs/legacy`) to read the factor state into the JWT claim `publicMetadata.twoFactorEnabled` so the middleware check works.
  - Smoke test that a brand-new admin (Mehdi / Renbo / equivalent) can land on `/admin/2fa-setup` on first sign-in, enroll TOTP, and proceed to `/admin`.
  - Flip `ENFORCE_ADMIN_2FA=true` on Vercel (Production scope). No code change required — the gate is already wired.
  - Remove the `TODO(A.1.2)` comments + the env-flag wrapper once enforcement is permanent (or leave the flag for future incident bypass — operator's call at landing time).
- **Trigger:** before opening admin signups beyond the pilot cohort, OR before any non-Resolute-employee gets admin access.
- Discussed: 2026-05-12.

## 🟡 Future ideas — explore later

### Cold-start warming for dashboard / admin Vercel functions
- **Context (2026-05-14, perf pass 3):** the dashboard layout Suspense refactor handles cold-starts gracefully — the skeleton header + page-level `loading.tsx` render the instant a navigation starts, even when the Vercel function takes 500-1500 ms to spin up. UX-wise the cold-start is no longer "blank page" but "skeleton for ~1 second then real content." Acceptable for v1 but not ideal.
- **Fix when it becomes a problem:** add a Vercel Cron (or external pinger like cron-job.org) that hits `/api/healthz` or any cheap auth-gated endpoint every 5 minutes during business hours. Keeps at least one function instance warm. Cost: a few thousand free Vercel invocations per month, well within free-tier.
- **Trigger:** when vendor-onboarding flow gets enough traffic that a noticeable share of visitors hit cold dashboard renders — measured via Vercel function metrics or a Sentry transaction trace on `/dashboard` TTFB.
- Out of scope for the perf pass; flagged here so future-self doesn't dig at it without context.


### "Did this lead anywhere?" feedback loop
- **Idea**: after a vendor reads an inquiry message, surface a small inline prompt: *"What did this turn into?"* → options: `Led to a customer` / `Promising — still talking` / `Spam` / `Irrelevant`.
- **Value**: aggregated across many vendors, this becomes a quality signal we can use to:
  - Surface "high-quality lead" tools higher in default sort
  - Detect spam patterns
  - Show vendors their own funnel (if X visitors contacted, Y converted)
- **Why deferred**: needs real volume of messages to be useful. Build after the platform has 50+ active vendors and meaningful message volume.
- **Estimate**: ~1 day for the UI + DB column; further work for analytics.
- Discussed: 2026-05-04.

### In-app reply threading
- **Decision**: for now, vendors reply via email only (mailto: button on message detail page). No in-app reply form.
- **If we revisit later**: would need a reply form on `/dashboard/messages/[id]` that POSTs the reply text → server sends it via Resend to the visitor → store reply in the message record. Visitor's reply-back would still go to vendor's email (one-way platform → email).
- **For full bidirectional threading**: would need to operate an inbound email server that ingests replies and routes them back to the platform. Significantly more infrastructure (Postmark/Mailgun inbound email APIs).
- **Trigger**: vendor feedback that email-only is limiting / vendors want a record of conversations in the platform.

### Mobile filter drawer polish
- Currently the filter drawer slides in from the right on mobile (`/`) — works but could use:
  - Focus trap (currently focus can escape the drawer)
  - Better animation easing
  - Maybe a "Clear all filters" prominent at the bottom
- Trigger: when QA-ing for public launch.

### Product rename / slug override (admin-only)
- **Context (2026-05-18, surfaced by `feat/product-edit-vendor-facing`):** product editing locks the slug. Vendors can rename a product (the apps.name field is editable) but the URL `/apps/<slug>` stays at the original slug forever — set when the product was first published. If a vendor substantially rebrands a product (e.g. "Acme Tasks" → "Acme Field"), external links and SEO continue to point at the old slug + an outdated mental model.
- **The fix:** add an admin-only slug override on the submission detail page (PR 2 admin review surface or a follow-up). Validates uniqueness, publishes the new slug, optionally writes a redirect from the old `/apps/<old-slug>` to `/apps/<new-slug>` so external links don't 404 mid-transition. Probably a `app_slug_redirects` table or a Next.js redirect rule generated from a column on `apps`.
- **Trigger:** the first time a vendor substantively renames a product OR the first time it surfaces as a real SEO ask. Out of scope for product-edit PRs 1–3.

### fix/extract-company-fields — share company form between wizard and edit form
- **Context (2026-05-17, surfaced by `fix/company-edit-match-wizard`):** the signup wizard's `CompanyStep` and the V.1 `/dashboard/company` edit form collect the same data, but they shipped as two independent implementations. They drifted within days — the edit form had an extra `employeeBand` field the wizard never collected, a different region picker (no "All" selector), different label copy, different input styles, and different validation behaviour. Patched in this PR by rewriting the edit form to mirror the wizard byte-for-byte, including duplicated copies of the wizard-private `Field`, `FieldError`, `ChipGroup`, `inputClsWithError`, `textareaClsWithError`, `err`, and `GEO_REGION_SLUGS` primitives.
- **The fix:** lift those primitives + the company field set into a shared component (e.g. `components/dashboard/company-fields.tsx`) that both the wizard step and the edit form render. Wizard wraps it in its multi-step shell; edit form wraps it in the pending/rejected/success banner shell. One source of truth, no drift possible.
- **Trigger:** before the next feature touches either surface, OR before PR 1 of vendor product editing lands (the product wizard/edit story will replay the exact same drift unless this is solved first).

## 🟢 Notes / decisions that future-self might forget

### Why we use Vercel
- CLAUDE.md §2 spec'd it. Free tier covers expected directory traffic comfortably. Paid tier ($20/mo) only needed when hitting scale or hosting-region constraints (CLAUDE.md §8 specifies EU/UAE region for compliance — Vercel can deploy to `fra1`/`dub1`/`cdg1` for EU when we go live for real).

### Real LinkedIn auth — DONE through dev instance, prod pending
- ✅ Stage 4 Phase A (2026-05-07) wired `@clerk/nextjs/legacy` `useSignIn().authenticateWithRedirect`, `/sso-callback` page renders `<AuthenticateWithRedirectCallback />`, lazy-create `vendor_members` row from Clerk user when webhook hasn't delivered, signed-in case handled across `/login` + button + header.
- 🟡 **Phase D.2 in progress** — Clerk Production instance switch. Blocked on LinkedIn Developer Portal "Sign in with LinkedIn using OpenID Connect" product review (1–72 h SLA). Custom credentials replace Clerk's shared sandbox LinkedIn OAuth keys.

### Pre-existing test failures — waived for Phase C kickoff (2026-05-14)
- CLAUDE.md §14 noted ~10 unrelated test failures (taxonomy seed mismatch, webhook ECONNRESET flakes, messages assertions, the `vendor-session` demo `ORDER BY` flake, plus the standing `tests/webhook-is-admin.test.ts` "UNVERIFIED email" case). The note said "fix before Phase B.2 PR 3 / Phase C kickoff."
- **Decision (2026-05-14):** waiver granted. Phase C PR 1 ships without a cleanup pass — the failures are pre-existing, well-understood (see the §14 detail), and not blocking the upload infrastructure work. New Phase C tests (`tests/lib/video.test.ts`, `tests/api/uploads.test.ts`) ship green on their own.
- **Trigger:** revisit before Phase C PR 2 merges. The diff hopefully isolates the seed expectations (the easiest fixes) without touching the webhook flakes (which need Neon dev-branch pool behaviour understood first).

### Orphan blob cleanup
- `/api/uploads` creates Blob objects keyed `<scope>/<vendor_id>/<timestamp>-<rand>.<ext>`. If the user uploads then abandons the wizard / removes a gallery item mid-flow / a submission is rejected and never resubmitted, the Blob persists.
- Phase C PR 1 accepts the cost. The vendor-keyed path prefix means a future cleanup job can list+delete by prefix without scanning every key.
- **Additional orphan path after gallery refactor (2026-05-15, `feat/move-gallery-to-product`):** any Blob objects under `vendor_gallery/<vendor_id>/...` written during the brief window the vendor-level gallery shipped are now orphaned — no DB rows reference them after migration 0018 dropped `vendor_gallery_images`. Sweep these alongside the rest when the cleanup job lands. Active scopes now: `vendor_logo`, `app_logo`, `app_gallery`.
- **Trigger:** when Vercel Blob usage approaches 800 MB/month (the spend-alert threshold) OR a vendor is suspended (cascade-delete from `app_screenshots` happens at the DB layer via `apps.id` FK; the Blob objects need a separate sweep).

### Phase C PR 3 — admin gallery editing (product-level)
- When the admin submission detail page lands (PR 3), the gallery editor must read + write `app_screenshots` keyed on the submission's resolved `app_id`, NOT the prior `vendor_gallery_images` keyed on vendor_id. Migration 0018 (`feat/move-gallery-to-product`, 2026-05-15) moved the source of truth.
- Admin upload scope is `app_gallery` (same scope vendors use). The `/api/uploads` route already accepts it; PR 3 just needs to pass the scope through.
- **Trigger:** Phase C PR 3 kickoff.

### Hide "Claim or edit this profile" on already-claimed vendors
- On `/vendors/[slug]`, the "Are you {vendor.name}? Claim or edit this profile →" CTA in the Vendor links sidebar currently renders for **every** vendor, including vendors that already have a `claimed_at` timestamp. Reads weirdly to a logged-in vendor visiting their own page (or to a visitor of a clearly-claimed company).
- Fix: gate the CTA on `vendor.claimedAt === null`. When claimed, drop it (or replace with a quieter "Need to update something? team@allinfratech.com" line).
- Out of scope for `fix/vendor-profile-layout-revised` (2026-05-15) — that PR moved the CTA into the new sidebar but didn't change visibility logic.
- **Trigger:** when the first real claimed vendor lands in production, OR sooner as part of a vendor-profile content pass.

### Background-removal on uploaded vendor logos
- Vendors upload logos as PNG/JPG with whatever background. We'd want a clean transparent version on the dark footer / over varied backgrounds.
- We did manual processing for the Resolute "R" logo using a Python script (Pillow + numpy `255 - min(r,g,b)` alpha trick).
- For real vendor uploads, options:
  - Require vendors to upload transparent PNGs (push the work to them)
  - Auto-process on upload via a server-side job (Pillow / `rembg` AI / Cloudflare Images background-removal API)
- **Trigger**: when vendor logo upload is wired (Phase 2).
