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
    label: "Relationship to general terms",
    content: (
      <p>
        These Vendor Terms apply in addition to the general{" "}
        <a
          href="/legal/terms"
          className="bloom-text underline-offset-4 hover:underline"
        >
          Terms of Service
        </a>{" "}
        and the{" "}
        <a
          href="/legal/privacy"
          className="bloom-text underline-offset-4 hover:underline"
        >
          Privacy Policy
        </a>
        . They govern the relationship between Resolute Management Consultancy
        (&ldquo;Resolute&rdquo;, &ldquo;we&rdquo;) and any individual or
        organisation (&ldquo;Vendor&rdquo;, &ldquo;you&rdquo;) that creates a
        vendor account on AllInfratech to submit and manage a listing. If
        anything in these Vendor Terms conflicts with the general Terms of
        Service, these Vendor Terms govern for the vendor relationship.
      </p>
    ),
  },
  {
    id: "eligibility-and-authority",
    label: "Eligibility and authority",
    content: (
      <>
        <p>By creating a vendor account, you represent and warrant that:</p>
        <ul className={ul}>
          <li>You are at least 18 years old and able to enter a binding contract.</li>
          <li>
            You are authorised by the company that owns the software product you
            intend to list to act on its behalf.
          </li>
          <li>
            The information you submit is accurate and not misleading.
          </li>
          <li>You will not impersonate another company, product, or individual.</li>
        </ul>
        <p>
          We may request reasonable evidence of your authority to manage a
          listing at any time. If we are not satisfied, we may suspend the
          listing pending verification.
        </p>
      </>
    ),
  },
  {
    id: "the-listing",
    label: "The listing",
    content: (
      <>
        <p>
          Through the vendor dashboard you may submit and update: product name,
          tagline, description, logo, screenshots, website URL, founded year,
          headquarters, applicable project stages, capabilities, pricing model,
          and other fields offered by the dashboard.
        </p>
        <p>
          <strong>Editorial discretion.</strong> AllInfratech is an editorial
          directory. Resolute reserves absolute editorial discretion over whether
          to publish a listing, copy-editing for clarity or tone, categorisation
          into stages and capabilities (including overriding your selections),
          adding editorial commentary, and removing or suspending a listing at
          any time. We will generally not change the substance of your
          description without good reason.
        </p>
        <p>
          <strong>Free of charge.</strong> Listings are free. We do not offer
          paid placements, sponsored ranking, or any paid visibility, and we will
          not solicit payment from you. If anyone purporting to represent
          AllInfratech or Resolute asks you to pay for placement, the request is
          fraudulent &mdash; please report it to{" "}
          <strong>team@allinfratech.com</strong>.
        </p>
      </>
    ),
  },
  {
    id: "content-licence",
    label: "Content licence",
    content: (
      <>
        <p>
          By submitting content (including logos, screenshots, product
          descriptions, marketing copy, taglines, and links) you grant Resolute a
          worldwide, non-exclusive, royalty-free, sublicensable licence to:
        </p>
        <ul className={ul}>
          <li>
            Display, reproduce, format, and adapt the content within the
            Directory.
          </li>
          <li>
            Include the content in editorial features, comparisons, or curated
            collections within the Directory.
          </li>
          <li>
            Use the content in a reasonable promotional context for the Directory
            itself (for example, social-media posts about a new listing).
          </li>
        </ul>
        <p>
          This licence terminates when your listing is removed, except that we
          may retain copies for archival, audit, and legal-defence purposes, and
          we are not required to remove copies already incorporated into prior
          promotional materials.
        </p>
        <p>
          You retain ownership of all intellectual property in the content you
          submit. You warrant that you have all rights necessary to grant the
          licence above and that the content does not infringe any third
          party&rsquo;s rights.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-submissions",
    label: "Acceptable submissions",
    content: (
      <>
        <p>You agree not to submit content that:</p>
        <ul className={ul}>
          <li>
            Is false, misleading, or materially inaccurate.
          </li>
          <li>Infringes any third party&rsquo;s intellectual-property rights.</li>
          <li>
            Contains malware, tracking pixels, or other code intended to harm
            visitors or harvest data.
          </li>
          <li>
            Defames, disparages, or unfairly compares competitors.
          </li>
          <li>Is unlawful, obscene, harassing, or otherwise inappropriate.</li>
        </ul>
        <p>
          Rich-text inputs are sanitised against an allowlist (paragraphs, bold,
          italic, lists, links). HTML, scripts, iframes, and inline styles are
          stripped server-side.
        </p>
      </>
    ),
  },
  {
    id: "vendor-contact-messages",
    label: "Visitor contact messages",
    content: (
      <>
        <p>
          Visitors may use a per-product contact form to send a message to you.
          Messages are forwarded by email to the contact address on your vendor
          account; a copy is sent to Resolute&rsquo;s internal inbox for
          moderation. Your email address is never displayed publicly.
        </p>
        <p>
          You are solely responsible for any subsequent communication with the
          visitor and for the lawfulness of how you handle the personal data they
          send you (including under the UAE Personal Data Protection Law and, if
          applicable, the EU/UK GDPR). Resolute is not a party to that
          communication or any business that follows.
        </p>
      </>
    ),
  },
  {
    id: "suspension-and-termination",
    label: "Suspension and termination",
    content: (
      <>
        <p>
          We may suspend or remove your listing and account, with or without
          notice, for reasons including breach of these terms, submission of
          false or infringing content, a reasonable belief that you are not
          authorised to represent the listed product, or operational, legal, or
          editorial reasons at Resolute&rsquo;s sole discretion.
        </p>
        <p>
          You may terminate your account at any time by contacting{" "}
          <strong>team@allinfratech.com</strong>. On termination, we will remove
          your published listing within 30&nbsp;days. Audit records may be
          retained as required to evidence compliance &mdash; see the{" "}
          <a
            href="/legal/privacy"
            className="bloom-text underline-offset-4 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "disclaimers-and-liability",
    label: "Disclaimers and liability",
    content: (
      <>
        <p>
          The Directory is provided to vendors free of charge and on an
          &ldquo;as is&rdquo; basis. Without limiting the disclaimers in the
          general Terms of Service:
        </p>
        <ul className={ul}>
          <li>
            We do not guarantee any level of traffic, leads, conversions, page
            rank, or commercial benefit from your listing.
          </li>
          <li>
            We do not guarantee uptime, indexing, or that your listing will
            appear in any particular position relative to other listings.
          </li>
          <li>
            We are not responsible for the conduct, claims, or solvency of any
            visitor who contacts you through the Directory.
          </li>
        </ul>
        <p>
          Our liability to you is limited as set out in the general{" "}
          <a
            href="/legal/terms#limitation-of-liability"
            className="bloom-text underline-offset-4 hover:underline"
          >
            Terms of Service
          </a>{" "}
          (including the AED&nbsp;500 aggregate cap).
        </p>
      </>
    ),
  },
  {
    id: "vendor-indemnity",
    label: "Vendor indemnity",
    content: (
      <>
        <p>
          In addition to the indemnity in the general Terms of Service, you agree
          to indemnify Resolute against any claim brought by a third party
          alleging that:
        </p>
        <ul className={ul}>
          <li>
            Content you submitted infringes their intellectual-property, privacy,
            or other rights;
          </li>
          <li>
            You were not authorised to represent the product you listed;
          </li>
          <li>
            The product or its marketing as represented by you violates
            applicable law.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "changes",
    label: "Changes to these terms",
    content: (
      <p>
        We may update these Vendor Terms. For material changes, we will email the
        contact address on your account at least 14&nbsp;days before the new
        version takes effect, and we may require you to re-accept inside the
        vendor dashboard before continuing to use it. If you do not accept, you
        may close your account and we will remove the listing.
      </p>
    ),
  },
  {
    id: "governing-law",
    label: "Governing law and disputes",
    content: (
      <p>
        These Vendor Terms are governed by the same law and dispute-resolution
        process as the general Terms of Service: laws of the{" "}
        <strong>
          Dubai International Financial Centre (DIFC), United Arab Emirates
        </strong>
        , with disputes resolved by{" "}
        <strong>
          arbitration administered by the DIFC-LCIA Arbitration Centre
        </strong>{" "}
        under the DIFC-LCIA Arbitration Rules. Seat: Dubai. Language: English.
        One arbitrator. Questions: <strong>team@allinfratech.com</strong>.
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
      version="1.1"
      sections={sections}
    />
  );
}
