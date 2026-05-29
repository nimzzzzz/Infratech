import type { Metadata } from "next";
import {
  DocumentLayout,
  type DocumentSection,
} from "@/components/site/document-layout";
import { TERMS_LAST_UPDATED } from "@/lib/legal/terms-version";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AllInfratech collects, uses, and protects personal data.",
  alternates: { canonical: "/legal/privacy" },
};

const ul = "list-disc space-y-2 pl-6";

const sections: DocumentSection[] = [
  {
    id: "who-we-are",
    label: "Who we are",
    content: (
      <p>
        This policy explains how Resolute Management Consultancy
        (&ldquo;Resolute&rdquo;, &ldquo;we&rdquo;) handles personal data for
        AllInfratech (the &ldquo;Directory&rdquo;), at allinfratech.com.
        We&rsquo;re responsible for the data described here, and you can reach us
        at team@allinfratech.com.
      </p>
    ),
  },
  {
    id: "data-we-collect",
    label: "Data we collect",
    content: (
      <>
        <p>From visitors browsing the site, we collect very little:</p>
        <ul className={ul}>
          <li>
            Aggregate analytics through a privacy-friendly, cookie-less provider
            &mdash; counts like page views, referrers, country, and device type,
            never individual visitors.
          </li>
          <li>
            Basic server logs (things like IP address, page requested, and
            timestamp), kept briefly for security and debugging.
          </li>
          <li>
            If you use the &ldquo;Contact this vendor&rdquo; form, the details you
            enter (typically name, email, and message) plus the IP address, to
            help prevent abuse.
          </li>
        </ul>
        <p>From vendors who sign in to manage a listing, we also collect:</p>
        <ul className={ul}>
          <li>
            Your account profile from LinkedIn sign-in &mdash; name, email, and
            LinkedIn profile link. We never see your LinkedIn password.
          </li>
          <li>
            The company you represent and the details you add through the
            dashboard.
          </li>
          <li>
            A record of when you accepted these terms (with the date, version, and
            IP address), and a log of the actions you take in the dashboard.
          </li>
          <li>
            Messages visitors send you, kept briefly for moderation and forwarded
            to your registered email.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "why-we-use-your-data",
    label: "How we use it",
    content: (
      <>
        <p>We use this data to:</p>
        <ul className={ul}>
          <li>run vendor accounts and the dashboard;</li>
          <li>
            operate, secure, and improve the directory, prevent abuse, and
            forward visitor messages to vendors;
          </li>
          <li>keep basic, aggregate analytics about how the site is used; and</li>
          <li>meet our legal obligations and respond to lawful requests.</li>
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    label: "How long we keep it",
    content: (
      <ul className={ul}>
        <li>Visitor analytics: aggregate only, with no per-visitor history.</li>
        <li>Server logs: short-term.</li>
        <li>
          Contact-form messages: until they&rsquo;re dealt with or no longer
          relevant.
        </li>
        <li>Vendor accounts: for as long as the account is open.</li>
        <li>
          Other records (such as terms acceptance and dashboard activity): for as
          long as we have a legitimate reason to keep them.
        </li>
      </ul>
    ),
  },
  {
    id: "data-sharing",
    label: "Who we share it with",
    content: (
      <>
        <p>
          We don&rsquo;t sell your personal data. We share it only with the
          service providers we need to run the directory:
        </p>
        <ul className={ul}>
          <li>an authentication provider, for vendor sign-in;</li>
          <li>hosting and database providers, to run the site;</li>
          <li>a file-storage provider, for vendor logos and screenshots;</li>
          <li>an email provider, to forward messages and send notifications;</li>
          <li>an analytics provider, for aggregate, cookie-less stats.</li>
        </ul>
        <p>
          We may also share data if the law requires it, to protect people&rsquo;s
          rights or safety, or as part of a future business sale &mdash; in which
          case we&rsquo;d let affected users know.
        </p>
      </>
    ),
  },
  {
    id: "international-transfers",
    label: "Where your data is processed",
    content: (
      <p>
        Your data may be processed in other countries, including the EU, UK, US,
        and UAE, depending on the providers we use. Where the law requires it, we
        put appropriate safeguards in place.
      </p>
    ),
  },
  {
    id: "security",
    label: "Security",
    content: (
      <p>
        We protect your data with standard security measures, including
        encryption in transit, access controls, and limiting who on our side can
        see it. No system is ever completely secure, so if you think your account
        has been compromised, please email us at team@allinfratech.com.
      </p>
    ),
  },
  {
    id: "your-rights",
    label: "Your rights",
    content: (
      <>
        <p>Depending on where you live, you can ask us to:</p>
        <ul className={ul}>
          <li>show you the data we hold about you;</li>
          <li>correct anything that&rsquo;s wrong;</li>
          <li>delete your data (where we&rsquo;re not required to keep it);</li>
          <li>limit or object to how we use it; or</li>
          <li>send you a copy in a portable format.</li>
        </ul>
        <p>
          To make a request, email team@allinfratech.com and we&rsquo;ll respond
          within the time the law allows (usually 30 days). You can also complain
          to your local data-protection authority.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    label: "Cookies",
    content: (
      <p>
        Visitors browsing the public directory get no cookies at all. When you
        sign in, we use a few essential cookies to keep you logged in. See the{" "}
        <a
          href="/legal/cookies"
          className="bloom-text underline-offset-4 hover:underline"
        >
          Cookie Policy
        </a>{" "}
        for details.
      </p>
    ),
  },
  {
    id: "children",
    label: "Children",
    content: (
      <p>
        The directory isn&rsquo;t aimed at children under 16, and we don&rsquo;t
        knowingly collect their data. If you think a child has shared data with
        us, email team@allinfratech.com and we&rsquo;ll delete it.
      </p>
    ),
  },
  {
    id: "changes",
    label: "Changes to this policy",
    content: (
      <p>
        We may update this policy from time to time. The date above shows the
        most recent change, and for significant changes affecting vendors
        we&rsquo;ll email the address on the account.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <DocumentLayout
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={TERMS_LAST_UPDATED}
      version="1.2"
      sections={sections}
    />
  );
}
