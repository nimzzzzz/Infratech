# Resolute Apps Directory — Website Requirements

**Version:** 1.0 (draft)
**Owner:** Resolute Management Consultancy
**Purpose:** Curated public directory of project management & infrastructure tools, organised by project stage. Used as a soft credibility tool in client meetings and as a passive lead/reputation asset for Resolute.

---

## 1. Product positioning

The site is **a directory, not a Resolute product page**. It should feel like an independent, curated resource — the kind of thing a consultancy quietly maintains because they care about the space.

- **Brand split:** The directory has its own name, logo, and visual identity. Resolute appears as: (a) one line in the footer ("Curated by Resolute Management Consultancy" with link), (b) a short paragraph on the About page, (c) optional small wordmark in the header. That's it.
- **No hard sell:** No Resolute service pitches, contact-us-for-consulting CTAs, or lead capture forms beyond the standard "suggest an app / contact us" form.
- **Tone:** Neutral, reference-style — like G2 or Capterra, not like a marketing site.
- **Decision needed before build:** Domain + name for the directory. Suggestions to consider — `infratools.io`, `buildstack.directory`, `projectstack.io`, `stagedtools.com`. Pick one and lock it before design starts.

---

## 2. Audiences & roles

Three distinct user types. Each gets a different experience.

| Role | Auth | What they do |
|---|---|---|
| **Visitor** (clients, prospects, public) | None | Browse, search, filter, click through to vendor sites |
| **Vendor** (app companies) | LinkedIn OAuth | Register, submit their app, manage their listing |
| **Admin** (Resolute team) | Email + password + 2FA | Approve listings, moderate content, manage taxonomy, seed content |

The login page must clearly state: **"This login is for app vendors who want to list their product. If you're looking for tools, no account is needed — just browse."**

---

## 3. Information architecture

### 3.1 Taxonomy (lock these before development)

**Project stages** (primary axis — matches your CSV):
- Feasibility
- Definition
- Delivery
- Operations
- Post-Delivery
- General (cross-stage tools)

An app can belong to **multiple stages** (e.g. CivCore is in all four).

**Capability tags** (secondary axis — also from your CSV, normalised):
Scheduling, Building Information Modelling, AI Agents, Design Review, Cost Estimation, Procurement, Project Portfolio Management, Operations Analysis, Capital Planning & Evaluation, Transaction Advisory, Knowledge Base, Risk Management, Construction Project Management, Document Control, Inspections & Snag List, Materials Management, Order Management, HSEQ, RFP Analysis, Reality Capture & Field Intelligence, Robotic Delivery, Event Chronology.

Capabilities are admin-managed — vendors pick from the existing list when submitting. New capability requests go to admin for approval. This prevents tag sprawl.

**Pricing models:**
Subscription, Pay-per-use, Service Contract, Priced by Project Size, Priced by Portfolio Size, Freemium, Contact for pricing.

**Industry/sector** (recommended new axis, not in CSV):
Construction, Infrastructure, Energy, Real Estate, Manufacturing, General. Helps clients narrow down faster.

### 3.2 Site map

```
/                          Home (hero + featured apps + browse-by-stage)
/browse                    Full directory with filters
/stages/[stage]            Stage landing pages (SEO)
/capabilities/[capability] Capability landing pages (SEO)
/apps/[slug]               App detail page
/about                     About the directory + Resolute mention
/suggest                   Public form to suggest an app
/contact                   General contact
/legal/terms
/legal/privacy
/legal/vendor-terms
/login                     Vendor login (LinkedIn)
/dashboard                 Vendor area (auth-gated)
/admin                     Admin area (separate auth)
```

---

## 4. Public site requirements

### 4.1 Homepage
- Hero: clear value prop (e.g. "Find the right tool for every stage of your project").
- Stage navigator: visual timeline/cards showing the 6 stages, click to filter.
- Featured apps section: 4–8 hand-picked apps (admin-controlled).
- Recently added section.
- Search bar prominent.
- Footer with Resolute attribution, legal links, social.

### 4.2 Browse page (`/browse`)
- **Filter sidebar** (left on desktop, drawer on mobile):
  - Stage (multi-select checkboxes)
  - Capability (multi-select, searchable list)
  - Pricing model (multi-select)
  - Industry (multi-select)
- **Active filters** shown as removable chips above results.
- **Search bar** for free-text search over app name, description, capabilities.
- **Sort:** Alphabetical (default), Recently added, Featured.
- **Results grid:** App cards showing logo, name, one-line description, stage tags, pricing badge.
- **URL state:** Filters reflected in URL params so results are shareable/bookmarkable.
- **Pagination or infinite scroll** (recommend pagination — better SEO).
- **Empty state:** "No tools match — try removing a filter, or [suggest an app]."

### 4.3 App detail page (`/apps/[slug]`)
Required sections:
- Header: logo, name, vendor name, "Visit website" CTA (external link, `rel="nofollow noopener"`), pricing badge, stage tags.
- Long description (rich text, 200–800 words).
- Capability tags (clickable, lead to filtered browse).
- Industries served.
- Pricing details (model + any specifics vendor provides).
- Screenshots / video (optional, vendor uploads).
- Key facts table: Founded, HQ, Geographic availability, Integrations.
- Vendor contact: "Contact this vendor" — opens form that emails the vendor (no direct email reveal — anti-scrape).
- Related tools: 3–4 apps with overlapping stages/capabilities.
- "Last updated" date (auto from DB).
- Disclaimer: "Listed for reference. Inclusion is not an endorsement by Resolute."

### 4.4 Stage and capability landing pages
- Auto-generated from taxonomy.
- SEO-optimised: H1 = stage/capability name, intro paragraph (admin-editable), full filtered list of apps below.
- These are the pages that should rank on Google for "[capability] software" queries.

### 4.5 Suggest an app page
Public form (no auth needed): Submitter name, email, app name, app URL, why it should be listed. Sent to admin for review and outreach.

---

## 5. Vendor side requirements

### 5.1 Login
- **LinkedIn OAuth only** (no email/password for vendors — reduces fake registrations and gives implicit identity verification).
- LinkedIn scope: basic profile + email.
- After first login, vendor is asked to confirm: company name, role, app they want to list.
- **Clear copy on login page**: "This login is for app vendors. If you're browsing, no account needed."

### 5.2 Vendor dashboard
After login, vendor sees:
- **My apps** (list of submitted/published apps with status badges: Draft, Pending Review, Published, Changes Requested, Rejected, Unpublished).
- **Submit new app** button.
- **Profile** (their LinkedIn profile info, editable display name).
- **Notifications** (status changes, admin messages).
- **Analytics** (per published app): page views (last 30/90 days), clicks to website, contact form submissions. Keep simple — no complex charts in v1.

### 5.3 App submission form
Multi-step or single long form (recommend multi-step for completion rate):

**Step 1 — Basics**
- App name (required, unique)
- Tagline (1 sentence, max 120 chars)
- Website URL (required, validated)
- Logo (PNG/SVG, max 2MB, square recommended)

**Step 2 — Categorisation**
- Stage(s) (multi-select, at least 1)
- Capability tags (multi-select, at least 1, max 8)
- Industry (multi-select)
- Pricing model (multi-select)

**Step 3 — Description**
- Long description (rich text editor, 200–1500 words, basic formatting only — bold, italic, lists, links)
- Key features (bulleted list, max 10)

**Step 4 — Details**
- Founded year
- HQ location
- Geographic availability (Global / specific regions)
- Integrations (free-text tags)
- Pricing details (free-text, optional)

**Step 5 — Media (optional)**
- Up to 5 screenshots (PNG/JPG, max 5MB each)
- 1 video URL (YouTube/Vimeo)

**Step 6 — Contact**
- Vendor display name (company)
- Contact email (not shown publicly, used for forwarded inquiries)
- LinkedIn company URL

**Step 7 — Review & submit**
- Preview of how listing will look
- Confirmation that vendor agrees to vendor terms
- Submit — enters Pending Review state

### 5.4 Edit existing listing
Edits go through review again (admin can configure: auto-approve minor edits like description, require approval for category changes).

---

## 6. Admin side requirements (Resolute internal)

This is critical and was not in the original brief — every directory needs heavy admin tooling.

### 6.1 Admin authentication
- Separate from vendor auth.
- Email + password + mandatory 2FA.
- Initially 2–3 admin accounts (you + 1–2 colleagues).

### 6.2 Admin dashboard
Top-level metrics: total apps, pending reviews, total visits this month, top apps by views, new vendor signups.

### 6.3 Submission review queue
- List of pending submissions, oldest first.
- Click into a submission — see full preview as it would appear publicly.
- Actions: **Approve & publish**, **Request changes** (with note to vendor), **Reject** (with reason).
- Bulk actions for spam.

### 6.4 App management
- Search/filter all apps (any status).
- Edit any app directly (override vendor content if needed).
- Feature toggle (mark as featured for homepage).
- Unpublish / republish.
- Hard delete (with confirmation).

### 6.5 Taxonomy management
- Add/edit/delete stages (rare).
- Add/edit/merge capability tags.
- Approve vendor-suggested new capabilities.

### 6.6 Vendor management
- List all registered vendors.
- View their submitted apps.
- Suspend a vendor (blocks login, hides their apps).

### 6.7 Content management
- Edit homepage hero copy.
- Edit stage/capability landing page intros.
- Edit About page.
- Edit legal pages.

### 6.8 Pre-seeded apps
**The 3–4 showcase apps you'll seed yourself** are managed here. Suggestion from the CSV — pick ones that are well-known but unlikely to self-register, with strong descriptions:
- **Primavera P6** (Definition, Delivery — Construction PM)
- **Procore** (Delivery — Construction PM)
- **nPlan** (Delivery — Risk Management)
- **Cognite** (Operations — Operations Analysis)

These get full descriptions written by Resolute, marked as "Editorial listing" internally (not visible to public). The other 14 in your CSV are also seeded but as standard listings.

---

## 7. Search & filter behaviour (detailed)

- **Filters are AND across categories, OR within a category.** Example: Stage = (Delivery OR Operations) AND Capability = (Risk Management). Standard directory behaviour.
- **Free-text search** uses full-text search on name, tagline, description, capabilities. Postgres `tsvector` is enough — no need for Elasticsearch in v1.
- **Filter counts:** Each filter option shows count of matching apps in current filter context (e.g. "Delivery (12)").
- **No-results experience:** Suggest removing filters, suggest an app, or browse by stage.
- **Performance target:** Filter/search results return in under 300ms for up to 1,000 apps.

---

## 8. Non-functional requirements

### 8.1 Performance
- Lighthouse score 90+ on all key pages (mobile and desktop).
- Largest Contentful Paint < 2.5s on 4G.
- Static generation for all public pages where possible (apps, stages, capabilities) with on-demand revalidation when an app is published or edited.

### 8.2 SEO (critical — this site lives or dies on organic traffic)
- Server-rendered or statically generated HTML for all public pages.
- Per-page meta titles and descriptions (admin-editable for app pages, auto-generated with override).
- Open Graph + Twitter card tags.
- JSON-LD structured data: `SoftwareApplication` schema on app detail pages, `BreadcrumbList`, `Organization` for the directory itself.
- XML sitemap auto-generated, submitted to Google Search Console.
- `robots.txt` configured, vendor dashboard and admin pages disallowed.
- Canonical URLs on all pages.
- Clean URLs (slugs, not IDs).

### 8.3 Mobile
- Fully responsive, mobile-first design.
- Filter drawer on mobile, sidebar on desktop.
- Touch targets ≥ 44px.

### 8.4 Accessibility
- WCAG 2.1 AA target.
- Semantic HTML, proper heading hierarchy.
- Keyboard navigation throughout.
- Alt text on all images (required field for vendor logo upload).
- Sufficient colour contrast (test with axe).

### 8.5 Browsers
Chrome, Edge, Safari, Firefox — last 2 versions. No IE support.

### 8.6 Security
- HTTPS only (HSTS).
- OAuth state parameter, PKCE.
- CSRF protection on all forms.
- Rate limiting on submission endpoints (prevent spam).
- Input sanitisation on all rich text (allowlist HTML).
- File upload validation: MIME type check, size limit, virus scan (use a service like ClamAV or rely on cloud storage scanning).
- Admin actions audit-logged.
- Secrets in environment variables, never committed.
- Regular dependency updates.

### 8.7 Privacy & legal
- GDPR-compliant cookie consent banner (only load analytics after consent).
- Privacy policy covering: vendor data, visitor analytics, cookies.
- Vendor terms covering: content ownership, IP, takedown rights, accuracy of submissions, Resolute's right to remove.
- Site-wide disclaimer: directory is informational, Resolute does not endorse or guarantee any listed tool.
- DSAR process (data export/deletion on request).
- Hosting region: EU or UAE for compliance with your client base.

### 8.8 Reliability
- 99.5% uptime target.
- Daily database backups, retained 30 days.
- Error monitoring (Sentry).
- Uptime monitoring (Better Uptime or similar).

---

## 9. Analytics

### 9.1 Site-wide
- Privacy-friendly analytics (Plausible or Umami — avoid GA4 to reduce cookie banner friction).
- Events: app page view, filter applied, search performed, "Visit website" click, "Contact vendor" submitted, "Suggest an app" submitted.

### 9.2 Per-app metrics (shown to vendors)
- Page views (last 30 / 90 days).
- Outbound clicks to their website.
- Contact form submissions.

### 9.3 Admin reports
- Total apps by stage / capability.
- Top 20 apps by views.
- Submission funnel (started → completed → approved → published).
- Vendor activity.

---

## 10. Recommended technical stack

Reusing your existing stack from Altaris Picks gives you the fastest path to ship:

- **Framework:** Next.js 15 (App Router) on Vercel.
- **Auth:** Clerk (LinkedIn OAuth provider for vendors, email+password+2FA for admins via separate Clerk instance or role).
- **Database:** Neon Postgres.
- **ORM:** Drizzle.
- **File storage:** Cloudflare R2 or Vercel Blob for logos/screenshots.
- **Email:** Resend (transactional: vendor notifications, contact forwards, suggest-an-app submissions).
- **Search:** Postgres full-text search (`tsvector` + `GIN` index). Upgrade to Algolia/Meilisearch only if it becomes a problem.
- **Rich text editor:** Tiptap (vendor description input).
- **Analytics:** Plausible (self-hosted or cloud).
- **Error monitoring:** Sentry.
- **CMS for editorial copy:** No separate CMS needed — admin panel handles it.

**Why this stack:** You already know it, it's production-proven, and a directory is well within its sweet spot. Don't introduce new tech for this project.

---

## 11. Database schema (high-level)

Core tables:

- `apps` — id, slug, name, tagline, description, logo_url, website_url, vendor_id, status, founded_year, hq_location, geographic_availability, integrations, pricing_details, featured, created_at, updated_at, published_at
- `stages` — id, name, slug, description (admin-editable)
- `capabilities` — id, name, slug, description
- `industries` — id, name, slug
- `pricing_models` — id, name, slug
- `app_stages` — app_id, stage_id (many-to-many)
- `app_capabilities` — app_id, capability_id
- `app_industries` — app_id, industry_id
- `app_pricing_models` — app_id, pricing_model_id
- `app_screenshots` — id, app_id, url, alt, position
- `vendors` — id, clerk_user_id, company_name, contact_email, linkedin_url, suspended, created_at
- `admins` — id, clerk_user_id, role, created_at
- `submissions` — tracks the review queue: id, app_id, submitted_by, submitted_at, status, reviewer_id, reviewed_at, review_notes
- `app_views` — id, app_id, day, count (rolled up daily for analytics)
- `outbound_clicks` — id, app_id, clicked_at
- `contact_messages` — id, app_id, sender_name, sender_email, message, created_at
- `suggestions` — public "suggest an app" submissions
- `audit_log` — admin actions

---

## 12. Content requirements (pre-launch)

Before the site goes live you need:

1. **Brand identity for the directory:** name, logo, colour palette, typography. 1–2 weeks of design work.
2. **18 app listings seeded** (your CSV) — the 4 showcase ones with full Resolute-written 400–600 word descriptions; the other 14 with shorter 100–200 word stubs that vendors can flesh out when they claim their listing.
3. **Stage landing page intros** (6 × ~150 words).
4. **Capability landing page intros** (~22 × ~100 words).
5. **About page copy** (~300 words, includes the subtle Resolute mention).
6. **Legal pages:** Terms of Use, Privacy Policy, Vendor Terms, Cookie Policy. Use a template service or a lawyer — don't write from scratch.
7. **Email templates** (Resend): vendor welcome, submission received, changes requested, listing approved, listing rejected, contact form forward, suggestion confirmation.

---

## 13. Phased delivery

Don't build everything at once. Suggested phasing:

### Phase 1 — MVP (4–6 weeks)
Public browse + filters + app detail pages, all 18 apps seeded by you (no vendor login yet), admin panel for managing apps and taxonomy, basic SEO, suggest-an-app form.

**Goal:** You can show the site to clients in meetings.

### Phase 2 — Vendor self-service (3–4 weeks)
LinkedIn OAuth, vendor dashboard, submission flow, admin review queue, vendor analytics, "claim this listing" flow for the 14 stub apps.

**Goal:** Vendors can register and manage their own listings, reducing your maintenance load.

### Phase 3 — Polish & growth (ongoing)
Featured apps, related apps, advanced analytics, comparison tool, email newsletter, paid featured placements (if ever wanted).

---

## 14. Out of scope for v1 (deliberately)

To keep the build tight:

- User reviews / ratings (high moderation burden, low value early on)
- App comparison tool (build once you have 50+ apps)
- Paid placements / monetisation
- Multi-language support
- Vendor messaging / inbox
- API for third parties
- Mobile app

Document these as "Phase 3+" and don't get talked into them in v1.

---

## 15. Open decisions (need your input before kickoff)

1. **Directory name and domain** — pick before design starts.
2. **Visual brand direction** — do you want serious/corporate, or modern/approachable? Reference 2–3 sites you like.
3. **Geographic positioning** — global, MENA-focused, or both? Affects copy and which apps you prioritise.
4. **Resolute footer line wording** — exact phrasing for the attribution.
5. **Which 4 apps to fully showcase** — confirm the suggested four (Primavera P6, Procore, nPlan, Cognite) or swap.
6. **Hosting region** — Vercel global edge is fine for performance; database region matters for compliance. UAE or EU recommended.
7. **Budget and timeline** — drives whether to build in-house, hire a contractor, or use an agency.

---

## 16. Success metrics (12 months post-launch)

- 50+ apps listed
- 30+ vendor self-service registrations
- 1,000+ monthly organic visitors
- Top-10 Google ranking for at least 3 capability terms
- Used in 10+ Resolute client meetings as a reference (track via internal log)

---

*End of requirements document.*
