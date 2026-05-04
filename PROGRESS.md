# Progress

Living log of what's done, what's in flight, and what's next. Update at the end of every working session.

## Status: scaffolded, home page built

Next.js 15 app scaffolded with Tailwind v4, framer-motion, phosphor-icons. Home page built per the [taste-skill](https://github.com/Leonxlnx/taste-skill) anti-slop framework. Public stub routes navigable. Dev server confirmed running.

## Blocked on (open decisions — see [CLAUDE.md §6](CLAUDE.md))

- [ ] Directory name + domain
- [ ] Visual brand direction
- [ ] Geographic positioning (global vs MENA vs both)
- [ ] Resolute footer attribution wording
- [ ] Confirm 4 showcase apps (suggested: Primavera P6, Procore, nPlan, Cognite)
- [ ] Hosting region (DB compliance)
- [ ] Budget + timeline (drives in-house vs contractor vs agency)

## Phase 1 — MVP (not started)

Goal: showable in client meetings.

- [x] Next.js 15 + TypeScript scaffold (manual, not `create-next-app`)
- [x] Tailwind v4 with `@theme` palette tokens (canvas, ink, night, magenta, coral)
- [x] Alike (heading) + Pavanam (body) wired via `next/font/google`
- [x] Public routes scaffolded: `/`, `/browse`, `/apps/[slug]`, `/stages/[stage]`, `/capabilities/[capability]`, `/about`, `/suggest`, `/contact`, all legal
- [x] Home page: asymmetric hero, stages strip, featured bento, how-it-works (zigzag), closing CTA
- [x] SEO basics: metadata, robots.ts, sitemap.ts, canonical URLs
- [ ] shadcn/ui set up (deferred — using bespoke components first)
- [ ] Drizzle schema for core tables (`apps`, `stages`, `capabilities`, `industries`, `pricing_models` + join tables)
- [ ] Neon connection + first migration
- [ ] Seed script for 18 starter apps (4 showcase with full Resolute-written copy, 14 stubs)
- [ ] Filter logic — AND across categories, OR within. URL state.
- [ ] Postgres full-text search (`tsvector` + GIN)
- [ ] Admin panel (auth, app CRUD, taxonomy management, content management)
- [ ] JSON-LD structured data (`SoftwareApplication`, `BreadcrumbList`, `Organization`)
- [ ] Suggest-an-app form → Resend → admin inbox (form is currently visual stub)
- [ ] Contact-vendor form (vendor email never exposed)
- [ ] Cookie consent banner + Plausible
- [ ] Legal pages drafted with counsel

## Phase 2 — Vendor self-service (not started)

- [ ] Clerk LinkedIn OAuth
- [ ] Vendor dashboard
- [ ] Multi-step submission flow (7 steps per requirements §5.3)
- [ ] Tiptap rich-text editor + server-side sanitisation
- [ ] Logo / screenshot upload (R2 or Blob, MIME + size + virus scan)
- [ ] Admin review queue (approve / request changes / reject)
- [ ] Vendor analytics (views, outbound clicks, contact submissions)
- [ ] "Claim this listing" flow for the 14 stub apps

## Phase 3 — Polish & growth (not started)

- [ ] Featured apps mechanism
- [ ] Related apps on detail page
- [ ] Advanced admin analytics (submission funnel, top apps, vendor activity)
- [ ] Email newsletter (deferred — confirm need first)
- [ ] Comparison tool (deferred until 50+ apps)

## Out of scope for v1

User reviews/ratings, comparison tool, paid placements, multi-language, vendor messaging inbox, public API, mobile app. See [docs/requirements.md §14](docs/requirements.md). **Don't get talked into these.**

## Content production (parallel track)

- [ ] Brand identity (name, logo, palette, type)
- [ ] 4 showcase apps: 400–600 word descriptions
- [ ] 14 stub apps: 100–200 word descriptions
- [ ] 6 stage landing intros (~150 words each)
- [ ] ~22 capability landing intros (~100 words each)
- [ ] About page copy (~300 words)
- [ ] Legal pages: terms, privacy, vendor terms, cookies
- [ ] Resend email templates: vendor welcome, submission received, changes requested, approved, rejected, contact forward, suggestion confirmation
