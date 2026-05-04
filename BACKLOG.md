# Backlog & Deferred Items

Things we deliberately put off so we can stay focused on the current build,
plus things that **must** be wired before specific milestones. **Re-read this
file before launching anything publicly.**

> Convention: each entry has **Why deferred**, **When to revisit**, and
> **Trigger** (the event that flips this from "later" to "now").

## ⚠️ Hard prerequisites before public launch

These cannot ship to a real audience without being addressed first.

### Contact-vendor form: spam protection
- **What's needed**: rate limiting (Upstash Redis, ~5 req/IP/hour on `/api/contact-vendor`) + Cloudflare Turnstile or hCaptcha invisible challenge on the form.
- **Why deferred**: contact form is mocked right now — no real emails go out, so spammers have nothing to abuse yet.
- **Trigger**: the day we wire Resend / make the form actually send emails. **Same day must have rate limit + CAPTCHA in place — do not deploy without both.**
- **Estimate**: ~half a day. Upstash account, `@upstash/ratelimit` package, Turnstile script tag + server-side token verify in the route handler.
- Discussed: 2026-05-04.

### Vendor email server side
- **What's needed**: actual `/api/contact-vendor` route that looks up vendor email (from DB), sends via Resend with templated HTML, writes message record to `vendor_messages` table.
- **Why deferred**: Phase 2 — depends on Clerk + Postgres + Resend all being wired.
- **Trigger**: phase 2 kickoff (when the Phase 1 design + admin shell is signed off).

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

### Why no real LinkedIn auth yet
- We're in design / iteration phase. Real LinkedIn OAuth needs a LinkedIn Developer app + Clerk account + env config — premature setup before the design is locked.
- **Trigger**: Phase 2 kickoff. Plan ~1-2 hours total: register LinkedIn app, set up Clerk project, wire `@clerk/nextjs`, swap `lib/auth/mock-session.ts` import for real `auth()`.

### Background-removal on uploaded vendor logos
- Vendors upload logos as PNG/JPG with whatever background. We'd want a clean transparent version on the dark footer / over varied backgrounds.
- We did manual processing for the Resolute "R" logo using a Python script (Pillow + numpy `255 - min(r,g,b)` alpha trick).
- For real vendor uploads, options:
  - Require vendors to upload transparent PNGs (push the work to them)
  - Auto-process on upload via a server-side job (Pillow / `rembg` AI / Cloudflare Images background-removal API)
- **Trigger**: when vendor logo upload is wired (Phase 2).
