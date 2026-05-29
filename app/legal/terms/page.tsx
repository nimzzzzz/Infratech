import type { Metadata } from "next";
import {
  DocumentLayout,
  type DocumentSection,
} from "@/components/site/document-layout";
import { TERMS_LAST_UPDATED } from "@/lib/legal/terms-version";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for AllInfratech.",
  alternates: { canonical: "/legal/terms" },
};

const ul = "list-disc space-y-2 pl-6";

const sections: DocumentSection[] = [
  {
    id: "who-we-are",
    label: "Who we are",
    content: (
      <p>
        AllInfratech (the &ldquo;Directory&rdquo;) is operated by Resolute
        Management Consultancy (&ldquo;Resolute&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;). It&rsquo;s an editorial reference of project-management
        and infrastructure-technology software, published at allinfratech.com.
        You can reach us any time at team@allinfratech.com.
      </p>
    ),
  },
  {
    id: "who-these-terms-apply-to",
    label: "Who these terms apply to",
    content: (
      <>
        <p>These terms apply to everyone who uses the directory:</p>
        <ul className={ul}>
          <li>Visitors browsing the site without signing in.</li>
          <li>
            Vendors who create an account to submit and manage a listing.
            Vendors are also covered by the{" "}
            <a
              href="/legal/vendor-terms"
              className="bloom-text underline-offset-4 hover:underline"
            >
              Vendor Terms
            </a>
            .
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "editorial-not-advertising",
    label: "Editorial, not advertising",
    content: (
      <>
        <p>
          AllInfratech is a curated, invitation-only directory. We list products
          we think are relevant to the project-management and infrastructure
          space. Inclusion is not an endorsement and not a guarantee that a
          product is right for you &mdash; always evaluate a product against your
          own needs.
        </p>
        <p>
          We don&rsquo;t charge for placement, ranking, or visibility, and no
          vendor pays to be listed or to rank higher.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    label: "Acceptable use",
    content: (
      <>
        <p>Please use the directory responsibly. In particular:</p>
        <ul className={ul}>
          <li>Only submit content you have the rights to use.</li>
          <li>Don&rsquo;t impersonate another company, product, or person.</li>
          <li>
            Don&rsquo;t misuse the directory or attempt to disrupt its normal
            operation.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "intellectual-property",
    label: "Intellectual property",
    content: (
      <>
        <p>
          The directory&rsquo;s design, software, branding, and editorial writing
          belong to Resolute. Please don&rsquo;t copy or reuse them without our
          permission.
        </p>
        <p>
          Content that vendors submit stays theirs &mdash; the permission they
          give us to display it is set out in the{" "}
          <a
            href="/legal/vendor-terms"
            className="bloom-text underline-offset-4 hover:underline"
          >
            Vendor Terms
          </a>
          . Product names, logos, and trademarks belong to their owners and
          appear here for reference only.
        </p>
      </>
    ),
  },
  {
    id: "contacting-vendors",
    label: "Contacting vendors",
    content: (
      <p>
        Visitors can message a vendor through the contact form on a product page.
        We forward the message to the vendor&rsquo;s registered email and keep a
        copy for moderation; the vendor&rsquo;s address is never shown publicly.
        We&rsquo;re not part of any conversation or deal that follows, and
        we&rsquo;re not responsible for how a vendor responds. There&rsquo;s more
        detail in the{" "}
        <a
          href="/legal/vendor-terms#vendor-contact-messages"
          className="bloom-text underline-offset-4 hover:underline"
        >
          Vendor Terms
        </a>
        .
      </p>
    ),
  },
  {
    id: "disclaimer",
    label: "Disclaimer",
    content: (
      <>
        <p>
          The directory is provided as it is, without warranties of any kind. We
          don&rsquo;t guarantee that the information is accurate, complete, or
          current, or that the site will always be available. You use it, and
          rely on any listing, at your own risk.
        </p>
        <p>
          We&rsquo;re not liable for losses arising from your use of the directory
          or from any dealings with a vendor you find through it. Nothing here
          limits any liability that can&rsquo;t be excluded under the law.
        </p>
      </>
    ),
  },
  {
    id: "suspension-and-removal",
    label: "Suspension and removal",
    content: (
      <p>
        We may suspend or end your access to the directory at any time &mdash; for
        example, if these terms are broken. You can stop using it whenever you
        like.
      </p>
    ),
  },
  {
    id: "governing-law",
    label: "Governing law",
    content: (
      <p>These terms are governed by the laws of the United Arab Emirates.</p>
    ),
  },
  {
    id: "changes",
    label: "Changes to these terms",
    content: (
      <p>
        We may update these terms from time to time. We&rsquo;ll change the date
        above when we do, and for significant changes we&rsquo;ll let signed-in
        vendors know by email. Continuing to use the directory means you accept
        the current version. Questions? Email team@allinfratech.com.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <DocumentLayout
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={TERMS_LAST_UPDATED}
      version="1.2"
      sections={sections}
    />
  );
}
