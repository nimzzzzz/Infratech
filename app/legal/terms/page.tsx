import type { Metadata } from "next";
import { LegalShell } from "@/components/site/legal-shell";
import { TERMS_LAST_UPDATED } from "@/lib/legal/terms-version";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for AllInfratech.",
  alternates: { canonical: "/legal/terms" },
};

const h2 = "mt-10 mb-3 font-heading text-[22px] leading-tight text-[var(--color-ink)] md:text-[24px]";
const h3 = "mt-6 mb-2 font-heading text-[18px] leading-tight text-[var(--color-ink)]";
const ul = "list-disc space-y-2 pl-6";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated={TERMS_LAST_UPDATED}>
      <p className="text-[14px] text-[var(--color-ink-3)]">
        AllInfratech &mdash; Terms of Service. Effective date: {TERMS_LAST_UPDATED}. Version 1.0.
      </p>

      <h2 className={h2}>1. Who we are</h2>
      <p>
        AllInfratech (the &ldquo;Directory&rdquo;) is operated by{" "}
        <strong>Resolute Management Consultancy</strong> (&ldquo;Resolute&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), contactable at{" "}
        team@allinfratech.com. Resolute is a management consultancy. The
        Directory is published at <strong>allinfratech.com</strong> as an
        editorial reference of project-management and infrastructure-technology
        software.
      </p>
      <p>
        You can reach us at <strong>team@allinfratech.com</strong> for questions
        about these Terms.
      </p>

      <h2 className={h2}>2. Who these Terms apply to</h2>
      <p>These Terms apply to anyone who uses the Directory:</p>
      <ul className={ul}>
        <li><strong>Visitors</strong> &mdash; anyone browsing the site without signing in.</li>
        <li><strong>Vendors</strong> &mdash; companies or individuals representing a software product who create an account to submit and manage a listing. Vendors are also bound by the additional <a href="/legal/vendor-terms" className="bloom-text underline-offset-4 hover:underline">Vendor Terms</a>.</li>
        <li><strong>Administrators</strong> &mdash; Resolute employees and contractors with access to the admin panel.</li>
      </ul>

      <h2 className={h2}>3. The Directory is editorial, not advertising</h2>
      <p>
        AllInfratech is a curated, invitation-only directory. We list software
        products we consider relevant to the project-management and
        infrastructure space. <strong>Inclusion in the Directory is not an
        endorsement, certification, recommendation, or guarantee of fitness</strong>{" "}
        for any particular purpose. Visitors should evaluate any product against
        their own requirements before relying on it.
      </p>
      <p>
        We accept no fees for placement, ranking, or visibility. Resolute may
        receive commercial benefit from the Directory only as part of its
        broader consultancy practice (for example, the Directory may inform
        client conversations); no listed vendor pays for or influences this
        benefit.
      </p>

      <h2 className={h2}>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul className={ul}>
        <li>Use the Directory in any way that violates applicable law, infringes any third party&rsquo;s rights, or breaches any fiduciary duty you owe to your employer.</li>
        <li>Submit content that is false, misleading, defamatory, infringing, obscene, harassing, or unlawful.</li>
        <li>Use automated systems (scrapers, bots, crawlers) to access the Directory at a rate or volume that imposes unreasonable load, except for well-behaved search-engine crawlers respecting <code>robots.txt</code>.</li>
        <li>Attempt to access non-public parts of the Directory (admin panel, other vendors&rsquo; dashboards, internal APIs) by any means other than the access we have explicitly granted you.</li>
        <li>Reverse-engineer, decompile, or attempt to extract the source code of the Directory.</li>
        <li>Use the Directory to send spam, unsolicited messages, or harvest email addresses.</li>
      </ul>
      <p>
        We may suspend or terminate access for any violation, with or without
        notice depending on severity.
      </p>

      <h2 className={h2}>5. Intellectual property</h2>
      <h3 className={h3}>Directory content we own.</h3>
      <p>
        The Directory&rsquo;s design, software, branding (&ldquo;AllInfratech&rdquo;),
        editorial copy written by Resolute (including stage and capability
        landing-page introductions, About-page text, and any commentary we add
        to vendor listings), and the structure and arrangement of the listings
        are owned by Resolute Management Consultancy and protected by copyright,
        trademark, and database-right law. You may not copy, redistribute, or
        create derivative works of this content without our written permission.
      </p>
      <h3 className={h3}>Vendor-submitted content.</h3>
      <p>
        Logos, product names, screenshots, descriptions, and other materials
        submitted by Vendors remain the intellectual property of the relevant
        Vendor or its licensors. By submitting them, the Vendor grants Resolute
        a worldwide, non-exclusive, royalty-free licence to display, reproduce,
        and adapt them within the Directory and in any reasonable promotional
        context for the Directory itself (for example, social-media posts about
        the Directory). This licence terminates if the Vendor&rsquo;s listing is
        removed.
      </p>
      <h3 className={h3}>Third-party trademarks.</h3>
      <p>
        Names, logos, and trademarks of listed companies belong to their
        respective owners and are used here for editorial reference. Their
        inclusion is not an assertion of ownership, sponsorship, or affiliation.
      </p>

      <h2 className={h2}>6. Visitor &ldquo;Contact this vendor&rdquo; form</h2>
      <p>
        Visitors may use the per-product contact form to send a message to a
        Vendor. The message is forwarded by email (via our email provider,
        Resend) to the Vendor&rsquo;s registered contact address; a copy is
        BCC&rsquo;d to Resolute&rsquo;s internal inbox for moderation purposes.
        The Vendor&rsquo;s email address is never displayed in the public site.{" "}
        <strong>Resolute is not a party to any subsequent communication or
        transaction between the Visitor and the Vendor</strong>, and accepts no
        responsibility for the Vendor&rsquo;s response, the Visitor&rsquo;s
        claims, or any business that follows.
      </p>

      <h2 className={h2}>7. Disclaimers</h2>
      <p>
        <strong>THE DIRECTORY IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
        AVAILABLE&rdquo;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED</strong>,
        including without limitation any warranty of merchantability, fitness
        for a particular purpose, accuracy, completeness, non-infringement, or
        uninterrupted availability.
      </p>
      <p>We do not warrant that:</p>
      <ul className={ul}>
        <li>Information in the Directory is accurate, current, or complete.</li>
        <li>Listed software products perform as their vendors describe.</li>
        <li>The Directory will be available without interruption or free of errors, viruses, or other harmful components.</li>
        <li>Any defect will be corrected.</li>
      </ul>
      <p>You use the Directory and any information you obtain from it <strong>at your own risk</strong>.</p>

      <h2 className={h2}>8. Limitation of liability</h2>
      <p>To the maximum extent permitted by applicable law:</p>
      <ul className={ul}>
        <li><strong>Resolute is not liable for any indirect, incidental, consequential, special, exemplary, or punitive damages</strong> arising out of or related to your use of the Directory, including without limitation lost profits, lost business, lost data, or loss of goodwill, even if we have been advised of the possibility of such damages.</li>
        <li><strong>Our aggregate liability</strong> for any claim arising out of or related to the Directory is limited to <strong>AED 500</strong> (five hundred United Arab Emirates Dirhams). This cap reflects that the Directory is provided free of charge.</li>
        <li>Some jurisdictions do not allow exclusion or limitation of certain damages; in those jurisdictions our liability is limited to the maximum extent permitted by applicable law.</li>
      </ul>
      <p>
        Nothing in these Terms limits liability for fraud, fraudulent
        misrepresentation, death or personal injury caused by negligence, or
        any other liability that cannot lawfully be excluded.
      </p>

      <h2 className={h2}>9. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless Resolute Management
        Consultancy, its officers, employees, and contractors from and against
        any claims, liabilities, damages, losses, and expenses (including
        reasonable legal fees) arising out of or related to:
      </p>
      <ul className={ul}>
        <li>Your breach of these Terms or any applicable law;</li>
        <li>Content you submit, including any claim that it infringes a third party&rsquo;s intellectual property, privacy, or other rights;</li>
        <li>Your use of the Directory beyond the scope of these Terms;</li>
        <li>Any dispute between you and another user of the Directory.</li>
      </ul>

      <h2 className={h2}>10. Suspension and termination</h2>
      <p>
        We may suspend or terminate your access to the Directory at any time,
        with or without notice, for any reason, including without limitation
        breach of these Terms. You may stop using the Directory at any time.
        Sections 5 (Intellectual Property), 7 (Disclaimers), 8 (Limitation of
        Liability), 9 (Indemnification), 11 (Governing Law), and any other
        provisions that by their nature should survive termination, will
        survive.
      </p>

      <h2 className={h2}>11. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the{" "}
        <strong>Dubai International Financial Centre (DIFC), United Arab
        Emirates</strong>, without regard to conflict-of-laws principles.
      </p>
      <p>
        Any dispute arising out of or related to these Terms or the Directory
        will be referred to and finally resolved by{" "}
        <strong>arbitration administered by the DIFC-LCIA Arbitration
        Centre</strong> under the DIFC-LCIA Arbitration Rules. The seat of
        arbitration will be Dubai, UAE. The language of arbitration will be
        English. The number of arbitrators will be one. The arbitrator&rsquo;s
        decision will be final and binding.
      </p>

      <h2 className={h2}>12. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. When we do, we will update
        the version date at the top and, for material changes, notify Vendors
        via the email address on their account at least 14 days before the new
        version takes effect. Continued use of the Directory after the effective
        date of an updated version constitutes acceptance of the changes. If
        you do not accept an update, you may stop using the Directory and
        request deletion of your account (see Privacy Policy section on data
        deletion).
      </p>

      <h2 className={h2}>13. Miscellaneous</h2>
      <ul className={ul}>
        <li><strong>Severability.</strong> If any provision of these Terms is held unenforceable, the remaining provisions will remain in full force.</li>
        <li><strong>No waiver.</strong> Our failure to enforce any provision is not a waiver of our right to do so later.</li>
        <li><strong>Assignment.</strong> You may not assign these Terms. We may assign them in connection with a merger, acquisition, or sale of all or substantially all of our assets.</li>
        <li><strong>Entire agreement.</strong> These Terms, together with the Vendor Terms, Privacy Policy, and Cookie Policy, constitute the entire agreement between you and us regarding the Directory and supersede any prior agreement.</li>
        <li><strong>Contact.</strong> Questions about these Terms: team@allinfratech.com.</li>
      </ul>
    </LegalShell>
  );
}
