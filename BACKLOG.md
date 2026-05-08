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

## 🟡 Future ideas — explore later

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

## 🟢 Notes / decisions that future-self might forget

### Why we use Vercel
- CLAUDE.md §2 spec'd it. Free tier covers expected directory traffic comfortably. Paid tier ($20/mo) only needed when hitting scale or hosting-region constraints (CLAUDE.md §8 specifies EU/UAE region for compliance — Vercel can deploy to `fra1`/`dub1`/`cdg1` for EU when we go live for real).

### Real LinkedIn auth — DONE through dev instance, prod pending
- ✅ Stage 4 Phase A (2026-05-07) wired `@clerk/nextjs/legacy` `useSignIn().authenticateWithRedirect`, `/sso-callback` page renders `<AuthenticateWithRedirectCallback />`, lazy-create `vendor_members` row from Clerk user when webhook hasn't delivered, signed-in case handled across `/login` + button + header.
- 🟡 **Phase D.2 in progress** — Clerk Production instance switch. Blocked on LinkedIn Developer Portal "Sign in with LinkedIn using OpenID Connect" product review (1–72 h SLA). Custom credentials replace Clerk's shared sandbox LinkedIn OAuth keys.

### Background-removal on uploaded vendor logos
- Vendors upload logos as PNG/JPG with whatever background. We'd want a clean transparent version on the dark footer / over varied backgrounds.
- We did manual processing for the Resolute "R" logo using a Python script (Pillow + numpy `255 - min(r,g,b)` alpha trick).
- For real vendor uploads, options:
  - Require vendors to upload transparent PNGs (push the work to them)
  - Auto-process on upload via a server-side job (Pillow / `rembg` AI / Cloudflare Images background-removal API)
- **Trigger**: when vendor logo upload is wired (Phase 2).
