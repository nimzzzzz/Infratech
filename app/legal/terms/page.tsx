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
        AllInfratech (the &ldquo;Directory&rdquo;) is operated by{" "}
        <strong>Resolute Management Consultancy</strong> (&ldquo;Resolute&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), a management
        consultancy contactable at <strong>team@allinfratech.com</strong>. The
        Directory is published at <strong>allinfratech.com</strong> as an
        editorial reference of project-management and infrastructure-technology
        software.
      </p>
    ),
  },
  {
    id: "who-these-terms-apply-to",
    label: "Who these terms apply to",
    content: (
      <>
        <p>These Terms apply to anyone who uses the Directory:</p>
        <ul className={ul}>
          <li>
            <strong>Visitors</strong> &mdash; anyone browsing the site without
            signing in.
          </li>
          <li>
            <strong>Vendors</strong> &mdash; companies or individuals
            representing a software product who create an account to submit and
            manage a listing. Vendors are also bound by the{" "}
            <a
              href="/legal/vendor-terms"
              className="bloom-text underline-offset-4 hover:underline"
            >
              Vendor Terms
            </a>
            .
          </li>
          <li>
            <strong>Administrators</strong> &mdash; Resolute employees and
            contractors with access to the admin panel.
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
          AllInfratech is a curated, invitation-only directory. We list software
          products we consider relevant to the project-management and
          infrastructure space.{" "}
          <strong>
            Inclusion is not an endorsement, certification, recommendation, or
            guarantee of fitness
          </strong>{" "}
          for any purpose. Visitors should evaluate any product against their own
          requirements.
        </p>
        <p>
          We accept no fees for placement, ranking, or visibility. Resolute may
          receive commercial benefit from the Directory only as part of its
          broader consultancy practice; no listed vendor pays for or influences
          this benefit.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    label: "Acceptable use",
    content: (
      <>
        <p>You agree not to:</p>
        <ul className={ul}>
          <li>
            Use the Directory in any way that violates applicable law or
            infringes any third party&rsquo;s rights.
          </li>
          <li>
            Submit content that is false, misleading, defamatory, infringing,
            obscene, harassing, or unlawful.
          </li>
          <li>
            Use automated systems (scrapers, bots, crawlers) to access the
            Directory at a rate or volume that imposes unreasonable load, except
            for well-behaved search-engine crawlers respecting{" "}
            <code>robots.txt</code>.
          </li>
          <li>
            Attempt to access non-public parts of the Directory by any means
            other than the access we have explicitly granted you.
          </li>
          <li>
            Reverse-engineer, decompile, or attempt to extract the source code
            of the Directory.
          </li>
          <li>
            Use the Directory to send spam, unsolicited messages, or harvest
            email addresses.
          </li>
        </ul>
        <p>
          We may suspend or terminate access for any violation, with or without
          notice depending on severity.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    label: "Intellectual property",
    content: (
      <>
        <p>
          <strong>Directory content we own.</strong> The Directory&rsquo;s
          design, software, branding, editorial copy written by Resolute, and the
          structure and arrangement of the listings are owned by Resolute
          Management Consultancy and protected by copyright, trademark, and
          database-right law. You may not copy, redistribute, or create
          derivative works without our written permission.
        </p>
        <p>
          <strong>Vendor-submitted content.</strong> The intellectual property
          licence that vendors grant to Resolute when submitting content is set
          out in the{" "}
          <a
            href="/legal/vendor-terms"
            className="bloom-text underline-offset-4 hover:underline"
          >
            Vendor Terms
          </a>
          . Names, logos, and trademarks of listed companies belong to their
          respective owners and are used here for editorial reference only.
        </p>
      </>
    ),
  },
  {
    id: "contact-vendor-form",
    label: "Contact-vendor form",
    content: (
      <>
        <p>
          Visitors may use the per-product contact form to send a message to a
          vendor. The message is forwarded by email to the vendor&rsquo;s
          registered contact address; a copy is sent to Resolute&rsquo;s
          internal inbox for moderation. The vendor&rsquo;s email address is
          never displayed publicly.
        </p>
        <p>
          <strong>
            Resolute is not a party to any subsequent communication or
            transaction between the visitor and the vendor
          </strong>
          , and accepts no responsibility for the vendor&rsquo;s response, the
          visitor&rsquo;s claims, or any business that follows. For full details,
          see the{" "}
          <a
            href="/legal/vendor-terms#vendor-contact-messages"
            className="bloom-text underline-offset-4 hover:underline"
          >
            Vendor Terms
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    label: "Disclaimers",
    content: (
      <>
        <p>
          <strong>
            THE DIRECTORY IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
            AVAILABLE&rdquo;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED
          </strong>
          , including without limitation any warranty of merchantability, fitness
          for a particular purpose, accuracy, completeness, or uninterrupted
          availability.
        </p>
        <p>
          You use the Directory and any information you obtain from it{" "}
          <strong>at your own risk</strong>.
        </p>
      </>
    ),
  },
  {
    id: "limitation-of-liability",
    label: "Limitation of liability",
    content: (
      <>
        <p>To the maximum extent permitted by applicable law:</p>
        <ul className={ul}>
          <li>
            <strong>
              Resolute is not liable for any indirect, incidental,
              consequential, special, exemplary, or punitive damages
            </strong>{" "}
            arising out of or related to your use of the Directory, even if we
            have been advised of the possibility of such damages.
          </li>
          <li>
            <strong>Our aggregate liability</strong> for any claim arising out of
            or related to the Directory is limited to{" "}
            <strong>AED&nbsp;500</strong> (five hundred United Arab Emirates
            Dirhams).
          </li>
          <li>
            Some jurisdictions do not allow exclusion or limitation of certain
            damages; in those jurisdictions our liability is limited to the
            maximum extent permitted by applicable law.
          </li>
        </ul>
        <p>
          Nothing in these Terms limits liability for fraud, fraudulent
          misrepresentation, death or personal injury caused by negligence, or
          any other liability that cannot lawfully be excluded.
        </p>
      </>
    ),
  },
  {
    id: "indemnification",
    label: "Indemnification",
    content: (
      <>
        <p>
          You agree to indemnify, defend, and hold harmless Resolute Management
          Consultancy, its officers, employees, and contractors from and against
          any claims, liabilities, damages, losses, and expenses (including
          reasonable legal fees) arising out of or related to:
        </p>
        <ul className={ul}>
          <li>Your breach of these Terms or any applicable law;</li>
          <li>
            Content you submit, including any claim that it infringes a third
            party&rsquo;s rights;
          </li>
          <li>Your use of the Directory beyond the scope of these Terms.</li>
        </ul>
      </>
    ),
  },
  {
    id: "suspension-and-termination",
    label: "Suspension and termination",
    content: (
      <p>
        We may suspend or terminate your access at any time, with or without
        notice, for any reason. You may stop using the Directory at any time.
        Sections on intellectual property, disclaimers, limitation of liability,
        indemnification, governing law, and any other provisions that by their
        nature should survive termination, will survive.
      </p>
    ),
  },
  {
    id: "governing-law",
    label: "Governing law and disputes",
    content: (
      <>
        <p>
          These Terms are governed by the laws of the{" "}
          <strong>
            Dubai International Financial Centre (DIFC), United Arab Emirates
          </strong>
          , without regard to conflict-of-laws principles.
        </p>
        <p>
          Any dispute will be referred to and finally resolved by{" "}
          <strong>
            arbitration administered by the DIFC-LCIA Arbitration Centre
          </strong>{" "}
          under the DIFC-LCIA Arbitration Rules. Seat: Dubai. Language: English.
          One arbitrator. The decision is final and binding.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    label: "Changes to these terms",
    content: (
      <p>
        We may update these Terms from time to time. When we do, we will update
        the version date at the top and, for material changes, notify vendors via
        the email address on their account at least 14&nbsp;days before the new
        version takes effect. Continued use after the effective date constitutes
        acceptance.
      </p>
    ),
  },
  {
    id: "miscellaneous",
    label: "Miscellaneous",
    content: (
      <ul className={ul}>
        <li>
          <strong>Severability.</strong> If any provision is held unenforceable,
          the remaining provisions remain in full force.
        </li>
        <li>
          <strong>No waiver.</strong> Our failure to enforce any provision is not
          a waiver of our right to do so later.
        </li>
        <li>
          <strong>Assignment.</strong> You may not assign these Terms. We may
          assign them in connection with a merger, acquisition, or sale of
          substantially all of our assets.
        </li>
        <li>
          <strong>Entire agreement.</strong> These Terms, together with the
          Vendor Terms, Privacy Policy, and Cookie Policy, constitute the entire
          agreement between you and us regarding the Directory.
        </li>
        <li>
          <strong>Contact.</strong> team@allinfratech.com.
        </li>
      </ul>
    ),
  },
];

export default function TermsPage() {
  return (
    <DocumentLayout
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={TERMS_LAST_UPDATED}
      version="1.1"
      sections={sections}
    />
  );
}
