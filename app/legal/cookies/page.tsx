import type { Metadata } from "next";
import {
  DocumentLayout,
  type DocumentSection,
} from "@/components/site/document-layout";
import { TERMS_LAST_UPDATED } from "@/lib/legal/terms-version";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How AllInfratech uses cookies and similar technologies.",
  alternates: { canonical: "/legal/cookies" },
};

const ul = "list-disc space-y-2 pl-6";

const sections: DocumentSection[] = [
  {
    id: "public-browsing",
    label: "Public browsing — no cookies",
    content: (
      <>
        <p>
          For visitors browsing the public Directory without signing in, we set{" "}
          <strong>no cookies at all</strong>. Our analytics provider is
          cookie-less by design: it counts visits in aggregate (page, referrer,
          country, device type) without using cookies, without identifying
          individual visitors, and without tracking across sites.
        </p>
        <p>
          Because no cookies are set on public pages, no cookie banner is
          displayed.
        </p>
      </>
    ),
  },
  {
    id: "authenticated-areas",
    label: "Authenticated areas — functional cookies only",
    content: (
      <>
        <p>
          When you sign in to a vendor or admin area, our authentication provider
          sets first-party cookies necessary to keep you signed in. These cookies
          are:
        </p>
        <ul className={ul}>
          <li>
            <strong>Strictly necessary</strong> for the authenticated area to
            function.
          </li>
          <li>
            <strong>First-party</strong>, set on the AllInfratech domain.
          </li>
          <li>
            <strong>HTTP-only</strong> where applicable, so they cannot be read
            by client-side JavaScript.
          </li>
          <li>
            <strong>Secure</strong>, transmitted only over HTTPS.
          </li>
          <li>
            Scoped to authentication and session management; not used for
            advertising or cross-site tracking.
          </li>
        </ul>
        <p>
          Because these cookies are strictly necessary, no consent banner is
          shown; this approach is consistent with the standard carve-out for
          strictly-necessary cookies under the EU ePrivacy Directive and UAE
          Personal Data Protection Law.
        </p>
      </>
    ),
  },
  {
    id: "what-we-do-not-use",
    label: "What we do not use",
    content: (
      <ul className={ul}>
        <li>No advertising cookies.</li>
        <li>
          No retargeting or audience-segmentation pixels.
        </li>
        <li>No third-party analytics that profile individual visitors.</li>
        <li>No fingerprinting techniques as a substitute for cookies.</li>
        <li>No cross-site trackers.</li>
      </ul>
    ),
  },
  {
    id: "your-choices",
    label: "Your choices",
    content: (
      <>
        <p>
          Because we use only strictly-necessary cookies (and only inside
          authenticated areas), there is nothing to opt out of for normal
          browsing. If you sign in and then block authentication cookies, the
          dashboard will not function.
        </p>
        <p>
          You can clear cookies at any time using your browser&rsquo;s settings.
          Doing so while signed in will sign you out.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    label: "Changes to this policy",
    content: (
      <p>
        If we ever introduce non-strictly-necessary cookies (for example, by
        adding a marketing or analytics tool that requires consent), we will
        update this policy, change the version date at the top, and display a
        consent banner before those cookies are set.
      </p>
    ),
  },
  {
    id: "contact",
    label: "Contact",
    content: (
      <p>
        Questions about this Cookie Policy:{" "}
        <strong>team@allinfratech.com</strong>.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <DocumentLayout
      eyebrow="Legal"
      title="Cookie Policy"
      lastUpdated={TERMS_LAST_UPDATED}
      version="1.1"
      sections={sections}
    />
  );
}
