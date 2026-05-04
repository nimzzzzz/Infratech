# Security

Operational security model for Resolute Apps Directory. Source-of-truth requirements live in [docs/requirements.md §8.6 / §8.7](docs/requirements.md); this file is the running checklist and incident playbook.

## Trust boundaries

| Boundary | Threats | Controls |
|---|---|---|
| Public visitor → site | Spam, scraping, automated form abuse | Rate limiting (Upstash), CSRF, hCaptcha/Turnstile on forms, vendor email never in HTML |
| Vendor → dashboard | Listing tampering, account takeover | Clerk LinkedIn OAuth (implicit identity check), admin review on every edit (configurable), session expiry |
| Admin → admin panel | Privilege escalation, insider error | Separate Clerk auth surface, mandatory 2FA, audit log on every mutation, ADMIN_CLERK_USER_IDS env-gated |
| User content → render | XSS, HTML injection, link spam | Server-side rich-text sanitiser (allowlist), `rel="nofollow noopener"` on all external links, no inline styles |
| Upload → storage → CDN | Malware, oversized payloads, MIME confusion | MIME sniff + extension match + size cap + virus scan before persist; serve from object storage, not the app origin |

## Hard rules

1. Secrets only in env vars. **Never** committed. `.env.local` is in `.gitignore` — verify before every push.
2. All server env access via `lib/env.ts` (imports `server-only`).
3. HTTPS only. HSTS header on. No mixed content.
4. OAuth: `state` parameter + PKCE (Clerk handles, but verify on upgrades).
5. CSRF tokens on every state-changing form. Server actions inherit Next.js's built-in protection — verify it's on.
6. Rate limit (per-IP and per-account) on: vendor signup, app submission, edit submission, suggest-an-app, contact-vendor.
7. Admin actions (approve, reject, edit, unpublish, delete, taxonomy edits, vendor suspension) write to `audit_log` with: actor id, action, target, timestamp, before/after JSON.
8. File uploads are validated server-side: MIME sniff, extension allowlist (PNG/JPG/SVG for logos; SVG must be sanitised separately), size cap, virus scan (ClamAV via worker, or rely on R2/Blob built-in scanning if available).
9. Vendor contact emails are stored but never returned by any public API or rendered in HTML. Vendor "contact" forms POST to a server route that forwards via Resend.
10. Dependencies: weekly `npm audit` review. Patch high/critical within 48h.

## Incident response — secret leak

If a secret lands in a commit:

1. **Rotate first, scrub second.** Order matters — scrubbing without rotating just hides a still-valid key.
2. Rotate keys per the table below.
3. Scrub history with `git filter-repo` (not `git filter-branch`).
4. Force-push the scrubbed history. Notify any collaborators to re-clone.
5. Note in an internal log: what leaked, when, what was rotated, what was force-pushed.

| Secret | Where to rotate |
|---|---|
| `DATABASE_URL` | Neon dashboard → connection string regenerate |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys |
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard → webhooks → rotate signing secret |
| `RESEND_API_KEY` | Resend dashboard → API keys |
| R2 / Blob keys | Cloudflare / Vercel dashboard |
| `SENTRY_AUTH_TOKEN` | Sentry → user auth tokens |
| `UPSTASH_*` | Upstash console |

## Privacy / compliance

- GDPR cookie consent (analytics only loads after accept).
- Privacy policy covers: vendor data, visitor analytics, cookies, contact forms.
- Vendor terms cover: content ownership, IP warranty (vendor warrants their submitted logo/copy is theirs), Resolute's takedown right, accuracy of submissions.
- DSAR (data subject access request): export and delete operations available from admin panel for both vendors and `contact_messages` senders.
- Hosting region: EU or UAE for compliance with the client base. Confirm Neon DB region matches.

## Pre-launch security checklist

- [ ] HTTPS + HSTS verified
- [ ] CSP header drafted and tested (likely strict for public pages, slightly relaxed for admin)
- [ ] CSRF protection verified on all forms
- [ ] Rate limiting configured on submission/contact/suggest endpoints
- [ ] File upload pipeline tested with malicious payloads (oversized, bad MIME, embedded JS in SVG)
- [ ] Rich-text sanitiser tested with XSS payload list
- [ ] `robots.txt` disallows `/dashboard/**` and `/admin/**`
- [ ] No vendor email in any rendered HTML or JSON response (manual audit)
- [ ] Audit log writes verified for every admin mutation
- [ ] Dependency audit clean
- [ ] Backup restore tested (not just configured — actually restored)
- [ ] Sentry receiving errors from production
