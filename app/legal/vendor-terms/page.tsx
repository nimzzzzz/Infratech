import type { Metadata } from "next";
import {
  DocumentLayout,
  type DocumentSection,
} from "@/components/site/document-layout";
import { TERMS_LAST_UPDATED } from "@/lib/legal/terms-version";

export const metadata: Metadata = {
  title: "Vendor Terms",
  description: "Additional terms for vendors with a listing on AllInfratech.",
  alternates: { canonical: "/legal/vendor-terms" },
};

const ul = "list-disc space-y-2 pl-6";

const sections: DocumentSection[] = [
  {
    id: "relationship-to-general-terms",
    label: "How these terms fit together",
    content: (
      <p>
        These Vendor Terms add to our general{" "}
        <a
          href="/legal/terms"
          className="bloom-text underline-offset-4 hover:underline"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="/legal/privacy"
          className="bloom-text underline-offset-4 hover:underline"
        >
          Privacy Policy
        </a>
        , and apply when you create a vendor account to submit and manage a
        listing. If anything here conflicts with the general terms, these terms
        apply for the vendor relationship.
      </p>
    ),
  },
  {
    id: "eligibility-and-authority",
    label: "Eligibility and authority",
    content: (
      <>
        <p>When you create a vendor account, you confirm that:</p>
        <ul className={ul}>
          <li>You&rsquo;re at least 18 and able to enter a contract.</li>
          <li>
            You&rsquo;re authorised to represent the company that owns the
            product you&rsquo;re listing.
          </li>
          <li>The information you give us is accurate and not misleading.</li>
          <li>
            You won&rsquo;t impersonate another company, product, or person.
          </li>
        </ul>
        <p>
          We may ask for reasonable proof that you&rsquo;re authorised to manage
          a listing, and may pause the listing until we&rsquo;re satisfied.
        </p>
      </>
    ),
  },
  {
    id: "the-listing",
    label: "Your listing",
    content: (
      <>
        <p>
          Through the dashboard you can submit and update your product details
          &mdash; name, tagline, description, logo, screenshots, website, stages,
          capabilities, pricing, and the other fields we offer.
        </p>
        <p>
          AllInfratech is an editorial directory, so we decide what gets
          published and how it&rsquo;s presented. That means we may edit your copy
          for clarity, adjust how a product is categorised, add context, or
          decline, suspend, or remove a listing. We won&rsquo;t change the
          substance of your description without good reason.
        </p>
        <p>
          Listings are free. We don&rsquo;t offer paid placements or sponsored
          ranking, and we&rsquo;ll never ask you to pay to be listed. If anyone
          claiming to represent us asks you for payment, it&rsquo;s not genuine
          &mdash; please tell us at team@allinfratech.com.
        </p>
      </>
    ),
  },
  {
    id: "content-licence",
    label: "Permission to show your content",
    content: (
      <>
        <p>
          You keep ownership of everything you submit &mdash; logos, screenshots,
          descriptions, and the rest. By submitting it, you give us permission to
          display, format, and adapt that content within the directory, and to
          use it to promote the directory itself (for example, a post about a new
          listing). That permission is worldwide and royalty-free, and it lasts
          while your listing is published.
        </p>
        <p>
          You confirm you have the rights to grant that permission and that your
          content doesn&rsquo;t infringe anyone else&rsquo;s rights. If your
          listing is removed, we may keep copies where we need them for our own
          records, and we don&rsquo;t have to undo material already used to
          promote the directory.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-submissions",
    label: "What not to submit",
    content: (
      <>
        <p>Please don&rsquo;t submit content that:</p>
        <ul className={ul}>
          <li>is false, misleading, or inaccurate;</li>
          <li>infringes someone else&rsquo;s rights;</li>
          <li>
            contains malware or anything designed to harm visitors or harvest
            data;
          </li>
          <li>unfairly disparages competitors; or</li>
          <li>is unlawful, obscene, or harassing.</li>
        </ul>
      </>
    ),
  },
  {
    id: "vendor-contact-messages",
    label: "Messages from visitors",
    content: (
      <p>
        Visitors can message you through the contact form on your product page.
        We forward those messages to your registered email and keep a copy for
        moderation; your address is never shown publicly. You&rsquo;re
        responsible for any conversation that follows and for handling the
        personal data people send you in line with applicable data-protection
        law &mdash; we&rsquo;re not part of it.
      </p>
    ),
  },
  {
    id: "suspension-and-termination",
    label: "Suspension and closing your account",
    content: (
      <p>
        We may suspend or remove your listing or account at any time &mdash; for
        example, if these terms are broken, a submission is false or infringing,
        or we have reason to think you&rsquo;re not authorised to represent the
        product. You can close your account any time by emailing
        team@allinfratech.com, and we&rsquo;ll remove your published listing
        within 30 days. We may keep limited records where we need them &mdash; see
        the{" "}
        <a
          href="/legal/privacy"
          className="bloom-text underline-offset-4 hover:underline"
        >
          Privacy Policy
        </a>
        .
      </p>
    ),
  },
  {
    id: "disclaimers-and-liability",
    label: "What we can and can't promise",
    content: (
      <p>
        Listings are free and provided as they are. We can&rsquo;t promise any
        particular level of traffic, leads, or results from your listing, or that
        it will appear in any particular position. We&rsquo;re also not
        responsible for anyone who contacts you through the directory.
      </p>
    ),
  },
  {
    id: "vendor-indemnity",
    label: "If your content causes a problem",
    content: (
      <p>
        If something you submit leads to a claim against us &mdash; for example,
        because it infringes someone&rsquo;s rights or you weren&rsquo;t
        authorised to represent the product &mdash; you agree to cover the
        resulting costs.
      </p>
    ),
  },
  {
    id: "changes",
    label: "Changes to these terms",
    content: (
      <p>
        We may update these Vendor Terms. For significant changes we&rsquo;ll
        email the address on your account, and we may ask you to re-accept the
        updated terms in your dashboard. If you don&rsquo;t accept, you can close
        your account and we&rsquo;ll remove the listing.
      </p>
    ),
  },
  {
    id: "governing-law",
    label: "Governing law",
    content: (
      <p>
        These terms are governed by the laws of the United Arab Emirates.
        Questions? Email team@allinfratech.com.
      </p>
    ),
  },
];

export default function VendorTermsPage() {
  return (
    <DocumentLayout
      eyebrow="Legal"
      title="Vendor Terms"
      lastUpdated={TERMS_LAST_UPDATED}
      version="1.2"
      sections={sections}
    />
  );
}
