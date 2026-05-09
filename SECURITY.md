# Security

Operational security model for AllInfratech. Source-of-truth requirements live in [docs/requirements.md §8.6 / §8.7](docs/requirements.md); this file is the running checklist and incident playbook.

## Trust boundaries

| Boundary | Threats | Controls |
|---|---|---|
| Public visitor → site | Spam, scraping, automated form abuse | IP-keyed rate limit on `/api/contact-vendor` (Stage 3, 5/hr/instance — distributed limit deferred to Stage 7); honeypot field on every public form; vendor email never in HTML |
| Vendor → dashboard | Listing tampering, account takeover | Clerk LinkedIn OAuth (implicit identity check); `requireOnboarded` gate defaults to TRUE on every dashboard page; admin review on every submission (Stage 5) |
| Admin → admin panel | Privilege escalation, insider error | Separate Clerk auth surface, mandatory 2FA (Stage 5), audit log on every mutation, role gated via `publicMetadata.role + DB lookup fallback` |
| User content → render | XSS, HTML injection, link spam | Server-side rich-text sanitiser allowlist (B.2 onwards), `rel="nofollow noopener"` on all external links, no inline styles |
| Upload → storage → CDN | Malware, oversized payloads, MIME confusion | MIME sniff + extension match + size cap (B.C); virus scan stubbed (B.C TODO); served from Vercel Blob (`allinfratech-uploads`, FRA1, public access — URLs are unguessable random strings), not the app origin. **Storage choice changed Phase D.4 2026-05-09 from R2 to Vercel Blob** to avoid the card-on-file requirement |
| Edge → origin | DDoS, country-level blocks | Cloudflare proxy in front of Vercel (Phase D.1) — UAE TRA filter on Vercel apex IP `216.198.79.1` necessitates this; bonus DDoS surface |

## Hard rules

1. Secrets only in env vars. **Never** committed. `.env.local` is in `.gitignore` — verify before every push.
2. All server env access via `lib/env.ts` (imports `server-only`). Lazy schemas for `database()`, `clerk()`, `resend()`, `r2()`, `sentry()` so partial env doesn't crash routes that don't need that group.
3. HTTPS only. Cloudflare layer enforces; Vercel origin serves valid Let's Encrypt cert under Full (Strict) SSL mode. HSTS header on (Cloudflare default).
4. OAuth: `state` parameter + PKCE (Clerk handles, but verify on upgrades).
5. CSRF tokens on every state-changing form. Server actions inherit Next.js's built-in protection — verify it's on.
6. Rate limit per-IP on every public form. **Stage 3 wired** for `/api/contact-vendor`. Stage 4 will wire it for `/api/submissions` per-vendor. Stage 7 replaces the in-memory bucket with a distributed (Redis/Upstash) store.
7. Admin actions (approve, reject, edit, unpublish, delete, taxonomy edits, vendor suspension) write to `audit_log` with: actor id, action, target, timestamp, before/after JSON. **Webhook GDPR deletes already write `vendor_member.gdpr_delete` rows**.
8. File uploads validated server-side: MIME sniff, extension allowlist (PNG/JPG/SVG for logos; SVG must be sanitised separately), size cap, virus scan (stubbed in Stage 4 Phase C; investigate Vercel Blob's built-in scanning options or post-upload Sentry-monitored hash check before launch). **Stage 4 Phase C uses `@vercel/blob`, not `@aws-sdk/client-s3`** (storage moved from R2 to Vercel Blob in Phase D.4, 2026-05-09).
9. **Vendor contact emails are stored on `vendors.contact_email` but never returned by any public API or rendered in HTML.** Visitor "contact this vendor" forms POST to `/api/contact-vendor` which forwards via Resend. Reply-To = visitor email so vendors reply directly without exposing their address.
10. Honeypot field on every public form (`website` input on contact-vendor; `website2` planned for submissions). Non-empty → silent 200, no DB / email writes.
11. Dependencies: weekly `npm audit` review. Patch high/critical within 48h.
12. **Schema invariant:** the `vendors.clerk_user_id` and `vendors.onboarded` columns are dropped (Phase B.1). Per-human session state lives on `vendor_members`. GDPR delete anonymises the `vendor_members` row + suspends the vendor row only if the deleted human was the sole active member.

## Incident response — secret leak

If a secret lands in a commit:

1. **Rotate first, scrub second.** Order matters — scrubbing without rotating just hides a still-valid key.
2. Rotate keys per the table below.
3. Scrub history with `git filter-repo` (not `git filter-branch`).
4. Force-push the scrubbed history. Notify any collaborators to re-clone.
5. Note in an internal log: what leaked, when, what was rotated, what was force-pushed.

| Secret | Where to rotate |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Neon dashboard → connection string regenerate |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk dashboard → webhooks → rotate signing secret |
| `RESEND_API_KEY` | Resend dashboard → API keys |
| `BLOB_READ_WRITE_TOKEN` | Vercel project → Storage → Blob → store `allinfratech-uploads` → Settings → rotate token |
| `SENTRY_AUTH_TOKEN` | Sentry → user auth tokens |

## Privacy / compliance

- GDPR cookie consent (analytics only loads after accept) — Plausible TBD.
- Privacy policy covers: vendor data, visitor analytics, cookies, contact forms, Clerk session cookies.
- Vendor terms cover: content ownership, IP warranty, Resolute's takedown right, accuracy of submissions.
- DSAR (data subject access request): export and delete operations available from admin panel for both vendors / vendor_members and `contact_messages` senders (Stage 5).
- **Vendor PII surfaces (auditable):** `vendor_members.{name, primary_email, linkedin_url, role}`, `vendors.contact_email`, `contact_messages.{sender_name, sender_email, sender_company, sender_role, body}`. None are publicly rendered.
- Hosting region: EU (Vercel `fra1` Frankfurt; Neon `eu-central-1` Frankfurt). Cloudflare layer doesn't have a regional pin — confirm acceptable for compliance.

## Pre-launch security checklist

- [x] HTTPS + HSTS verified (Cloudflare + Vercel)
- [ ] CSP header drafted and tested (likely strict for public pages, slightly relaxed for admin)
- [x] CSRF protection verified on `/api/contact-vendor` (Next.js server-action protection inherited; route-level Zod validation rejects malformed bodies)
- [x] Rate limiting configured on `/api/contact-vendor` (in-memory, per-instance — distributed deferred Stage 7)
- [x] Honeypot field on contact-vendor form (silent-drop)
- [ ] File upload pipeline tested with malicious payloads (oversized, bad MIME, embedded JS in SVG) — Stage 4 Phase C
- [ ] Rich-text sanitiser tested with XSS payload list — Stage 4 Phase D
- [x] `robots.txt` disallows `/dashboard/**` and `/admin/**`
- [x] No vendor email in any rendered HTML or JSON response (manual audit; lazy-create + webhook never expose it; `/apps/[slug]` JSON-LD shows vendor URL only, not email)
- [x] Audit log writes verified for `vendor_member.gdpr_delete` (webhook). Wider admin-mutation coverage lands Stage 5.
- [ ] Dependency audit clean (`npm audit` shows 6 moderate-severity deps from `resend` / `react-email`; assess before launch)
- [ ] Backup restore tested (not just configured — actually restored)
- [ ] Sentry receiving errors from production
- [ ] Cloudflare WAF rules reviewed (free tier provides baseline; configure managed rules if needed)
- [ ] DMARC tightened from `p=none` (current) to `p=quarantine` then `p=reject` after a week of clean DMARC reports
- [ ] LinkedIn OAuth app reviewed by LinkedIn (Phase D.2 prerequisite)
