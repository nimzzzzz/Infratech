import type { Metadata } from "next";
import {
  DocumentLayout,
  type DocumentSection,
} from "@/components/site/document-layout";
import { TERMS_LAST_UPDATED } from "@/lib/legal/terms-version";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How AllInfratech uses cookies.",
  alternates: { canonical: "/legal/cookies" },
};

const ul = "list-disc space-y-2 pl-6";

const sections: DocumentSection[] = [
  {
    id: "public-browsing",
    label: "Browsing the directory",
    content: (
      <p>
        If you&rsquo;re just browsing the public directory, we set no cookies at
        all. Our analytics provider is cookie-less &mdash; it counts visits in
        aggregate without identifying you or tracking you across other sites. So
        there&rsquo;s no cookie banner, because there&rsquo;s nothing to consent
        to.
      </p>
    ),
  },
  {
    id: "authenticated-areas",
    label: "When you sign in",
    content: (
      <>
        <p>
          When you sign in to a vendor or admin area, we use a few essential
          cookies to keep you logged in. They are:
        </p>
        <ul className={ul}>
          <li>essential &mdash; sign-in doesn&rsquo;t work without them;</li>
          <li>first-party, set on the AllInfratech domain;</li>
          <li>used only for sign-in and your session, never for advertising.</li>
        </ul>
        <p>
          Because they&rsquo;re essential, we don&rsquo;t show a consent banner
          for them &mdash; that&rsquo;s the standard approach for strictly
          necessary cookies.
        </p>
      </>
    ),
  },
  {
    id: "what-we-do-not-use",
    label: "What we don't use",
    content: (
      <p>
        No advertising cookies, no tracking pixels, no third-party analytics that
        profile you, and no cross-site tracking.
      </p>
    ),
  },
  {
    id: "your-choices",
    label: "Your choices",
    content: (
      <p>
        Since we only use essential cookies inside the signed-in area,
        there&rsquo;s nothing to opt out of for normal browsing. You can clear
        cookies any time in your browser settings &mdash; doing so while
        signed in will sign you out.
      </p>
    ),
  },
  {
    id: "changes",
    label: "Changes to this policy",
    content: (
      <p>
        If we ever add cookies that aren&rsquo;t strictly necessary, we&rsquo;ll
        update this page and show a consent banner before they&rsquo;re set.
        Questions? Email team@allinfratech.com.
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
      version="1.2"
      sections={sections}
    />
  );
}
