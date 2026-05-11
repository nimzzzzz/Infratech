import type { Metadata } from "next";
import { LegalShell } from "@/components/site/legal-shell";
import { TERMS_LAST_UPDATED } from "@/lib/legal/terms-version";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How AllInfratech uses cookies and similar technologies.",
  alternates: { canonical: "/legal/cookies" },
};

const h2 = "mt-10 mb-3 font-heading text-[22px] leading-tight text-[var(--color-ink)] md:text-[24px]";
const ul = "list-disc space-y-2 pl-6";

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" updated={TERMS_LAST_UPDATED}>
      <p className="text-[14px] text-[var(--color-ink-3)]">
        AllInfratech &mdash; Cookie Policy. Effective date: {TERMS_LAST_UPDATED}. Version 1.0.
      </p>

      <p>
        This Cookie Policy explains what cookies and similar technologies are
        used on AllInfratech (the &ldquo;Directory&rdquo;), why we use them,
        and the choices you have. It supplements our{" "}
        <a href="/legal/privacy" className="bloom-text underline-offset-4 hover:underline">Privacy Policy</a>.
      </p>

      <h2 className={h2}>1. Public browsing &mdash; no cookies</h2>
      <p>
        For visitors browsing the public Directory without signing in, we set{" "}
        <strong>no cookies at all</strong>. Our analytics provider, Plausible
        Analytics, is cookie-less by design: it counts visits in aggregate
        (page, referrer, country, device type) without using cookies, without
        identifying individual visitors, and without tracking visitors across
        sites.
      </p>
      <p>
        Because no cookies are set on public pages, no cookie banner is
        displayed. This is intentional: the most privacy-respectful design is
        to avoid the cookies in the first place.
      </p>

      <h2 className={h2}>2. Authenticated areas &mdash; functional cookies only</h2>
      <p>
        When you sign in to a Vendor or Admin area
        (<code>/dashboard/**</code> or <code>/admin/**</code>), our
        authentication provider, Clerk, sets first-party cookies necessary to
        keep you signed in. These cookies are:
      </p>
      <ul className={ul}>
        <li><strong>Strictly necessary</strong> for the authenticated area to function. Without them, sign-in cannot work.</li>
        <li><strong>First-party</strong>, set on the AllInfratech domain (or its Clerk-issued auth subdomain).</li>
        <li><strong>HTTP-only</strong> where applicable, so they cannot be read by client-side JavaScript.</li>
        <li><strong>Secure</strong>, transmitted only over HTTPS.</li>
        <li>Scoped to authentication and session management; not used for advertising or cross-site tracking.</li>
      </ul>
      <p>
        Because these cookies are strictly necessary, no consent banner is
        shown for them; this approach is consistent with the standard
        carve-out for strictly-necessary cookies under the EU ePrivacy
        Directive and UAE Personal Data Protection Law.
      </p>

      <h2 className={h2}>3. What we do NOT use</h2>
      <ul className={ul}>
        <li>No advertising cookies.</li>
        <li>No retargeting or audience-segmentation pixels (Meta Pixel, Google Ads, LinkedIn Insight, etc.).</li>
        <li>No third-party analytics that profile individual visitors.</li>
        <li>No fingerprinting techniques as a substitute for cookies.</li>
        <li>No cross-site trackers.</li>
      </ul>

      <h2 className={h2}>4. Your choices</h2>
      <p>
        Because we use only strictly-necessary cookies (and only inside
        authenticated areas), there is nothing to opt out of for normal
        browsing. If you sign in and then block authentication cookies in your
        browser, the dashboard will not function &mdash; that is expected.
      </p>
      <p>
        You can clear cookies at any time using your browser&rsquo;s settings.
        Doing so while signed in will sign you out.
      </p>

      <h2 className={h2}>5. Changes to this Cookie Policy</h2>
      <p>
        If we ever change the technologies described above &mdash; for
        example, by adding a third-party analytics or marketing tool that
        requires consent &mdash; we will update this policy, change the
        version date at the top, and (for any change that introduces non-
        strictly-necessary cookies) display a consent banner before those
        cookies are set.
      </p>

      <h2 className={h2}>6. Contact</h2>
      <p>
        Questions about this Cookie Policy: <strong>team@allinfratech.com</strong>.
      </p>
    </LegalShell>
  );
}
