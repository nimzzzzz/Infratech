import type { Metadata } from "next";
import { LegalShell } from "@/components/site/legal-shell";
import { TERMS_LAST_UPDATED } from "@/lib/legal/terms-version";

export const metadata: Metadata = {
  title: "Vendor Terms",
  description: "Additional terms for vendors with a listing on AllInfratech.",
  alternates: { canonical: "/legal/vendor-terms" },
};

const h2 = "mt-10 mb-3 font-heading text-[24px] leading-tight text-[var(--color-ink)] md:text-[26px]";
const h3 = "mt-6 mb-2 font-heading text-[20px] leading-tight text-[var(--color-ink)]";
const ul = "list-disc space-y-2 pl-6";

export default function VendorTermsPage() {
  return (
    <LegalShell title="Vendor Terms" updated={TERMS_LAST_UPDATED}>
      <p className="text-[16px] text-[var(--color-ink-3)]">
        AllInfratech &mdash; Vendor Terms. Effective date: {TERMS_LAST_UPDATED}. Version 1.0.
      </p>

      <p>
        These Vendor Terms apply in addition to the general{" "}
        <a href="/legal/terms" className="bloom-text underline-offset-4 hover:underline">Terms of Service</a>{" "}
        and the{" "}
        <a href="/legal/privacy" className="bloom-text underline-offset-4 hover:underline">Privacy Policy</a>.
        They govern the relationship between Resolute Management Consultancy
        (&ldquo;Resolute&rdquo;, &ldquo;we&rdquo;) and any individual or
        organisation (&ldquo;Vendor&rdquo;, &ldquo;you&rdquo;) that creates a
        vendor account on AllInfratech to submit and manage a listing for a
        software product. If anything in these Vendor Terms conflicts with the
        general Terms of Service, these Vendor Terms govern for the vendor
        relationship.
      </p>

      <h2 className={h2}>1. Eligibility and authority</h2>
      <p>By creating a vendor account, you represent and warrant that:</p>
      <ul className={ul}>
        <li>You are at least 18 years old and able to enter a binding contract.</li>
        <li>You are authorised by the company that owns the software product you intend to list to act on its behalf for the purposes of these Vendor Terms.</li>
        <li>The information you submit (company name, product details, logos, screenshots, contact details, links) is accurate and not misleading.</li>
        <li>You will not impersonate another company, product, or individual.</li>
      </ul>
      <p>
        We may, at any time and at our sole discretion, request reasonable
        evidence of your authority to manage a listing. If we are not satisfied,
        we may suspend the listing pending verification.
      </p>

      <h2 className={h2}>2. The listing</h2>
      <h3 className={h3}>What you submit.</h3>
      <p>
        Through the vendor dashboard you may submit and update: product name,
        tagline, description, logo, screenshots, website URL, founded year,
        headquarters, applicable project stages, capabilities, pricing model,
        and other fields offered by the dashboard. Some fields are required
        for a listing to be published.
      </p>
      <h3 className={h3}>Editorial discretion.</h3>
      <p>
        AllInfratech is an editorial directory. Resolute reserves absolute
        editorial discretion over:
      </p>
      <ul className={ul}>
        <li>Whether to publish a submitted listing at all.</li>
        <li>Copy-editing your submission for clarity, tone, accuracy, or length.</li>
        <li>Categorising your product into stages and capabilities, including overriding your own selections where we judge them inaccurate.</li>
        <li>Adding editorial commentary or context alongside your listing.</li>
        <li>Removing, suspending, or de-listing your product at any time.</li>
      </ul>
      <p>
        We will generally not change the substance of your description without
        good reason, but we are not obliged to consult you before editing.
      </p>
      <h3 className={h3}>Free of charge.</h3>
      <p>
        Listings are free. You will not be invoiced. We do not offer paid
        placements, sponsored ranking, &ldquo;featured&rdquo; tiers, or any
        other paid visibility, and we will not solicit payment from you to
        create, maintain, improve, or restore a listing. If anyone purporting
        to represent AllInfratech or Resolute asks you to pay for placement,
        the request is fraudulent &mdash; please report it to{" "}
        <strong>team@allinfratech.com</strong>.
      </p>

      <h2 className={h2}>3. Content licence</h2>
      <p>
        By submitting content (including without limitation logos, screenshots,
        product descriptions, marketing copy, taglines, and links) you grant
        Resolute a worldwide, non-exclusive, royalty-free, sublicensable
        licence to:
      </p>
      <ul className={ul}>
        <li>Display, reproduce, format, and adapt the content within the Directory.</li>
        <li>Include the content in editorial features, comparisons, lists, or curated collections within the Directory.</li>
        <li>Use the content in a reasonable promotional context for the Directory itself (for example, social-media posts about a new listing, screenshots of the Directory in marketing materials).</li>
      </ul>
      <p>
        This licence terminates when your listing is removed from the Directory,
        except that we may retain copies for archival, audit, and legal-defence
        purposes, and we are not required to remove copies already incorporated
        into prior promotional materials.
      </p>
      <p>
        You retain ownership of all intellectual property in the content you
        submit. You warrant that you have all rights necessary to grant the
        licence above and that the content does not infringe any third
        party&rsquo;s copyright, trademark, privacy, or other rights.
      </p>

      <h2 className={h2}>4. Acceptable submissions</h2>
      <p>You agree not to submit content that:</p>
      <ul className={ul}>
        <li>Is false, misleading, or materially inaccurate (including misleading claims about features, pricing, certifications, customer base, or performance).</li>
        <li>Infringes any third party&rsquo;s intellectual-property rights.</li>
        <li>Contains malware, tracking pixels, or other code intended to harm visitors or harvest data.</li>
        <li>Defames, disparages, or unfairly compares competitors. Factual feature comparisons are acceptable; ad-hominem or unsubstantiated negative claims are not.</li>
        <li>Is unlawful, obscene, harassing, discriminatory, or otherwise inappropriate.</li>
        <li>Embeds external scripts or third-party trackers.</li>
      </ul>
      <p>
        Rich-text inputs are sanitised against an allowlist (paragraphs, bold,
        italic, lists, links). HTML, scripts, iframes, inline styles, and
        custom elements are stripped server-side.
      </p>

      <h2 className={h2}>5. Visitor &ldquo;Contact this vendor&rdquo; messages</h2>
      <p>
        Visitors may use a per-product contact form to send a message to you.
        Messages are forwarded by email (via Resend) to the contact address on
        your vendor account; a copy is BCC&rsquo;d to Resolute&rsquo;s internal
        inbox for moderation. Your email address is never displayed publicly.
      </p>
      <p>
        You are solely responsible for any subsequent communication with the
        Visitor and for the lawfulness of how you handle the personal data they
        send you (including under the UAE Personal Data Protection Law and, if
        applicable, the EU/UK GDPR). Resolute is not a party to that
        communication or any business that follows.
      </p>

      <h2 className={h2}>6. Suspension and termination</h2>
      <p>We may suspend or remove your listing and account, with or without notice, for reasons including:</p>
      <ul className={ul}>
        <li>Breach of these Vendor Terms or the general Terms of Service.</li>
        <li>Submission of false, misleading, or infringing content.</li>
        <li>A reasonable belief that you are not authorised to represent the product you have listed.</li>
        <li>A request from the apparent rightful owner of a product who can demonstrate authority over the listing.</li>
        <li>The product becoming materially out of scope for the Directory (for example, no longer infrastructure or project-management software).</li>
        <li>Operational, legal, or editorial reasons at Resolute&rsquo;s sole discretion.</li>
      </ul>
      <p>
        You may terminate your account at any time by contacting{" "}
        <strong>team@allinfratech.com</strong>. On termination, we will remove
        your published listing within 30 days. Audit records, including the
        legal-acceptance log, may be retained as required to evidence
        compliance &mdash; see the Privacy Policy.
      </p>

      <h2 className={h2}>7. Disclaimers and liability (vendor specific)</h2>
      <p>
        The Directory is provided to Vendors free of charge and on an
        &ldquo;as is&rdquo; basis. Without limiting the disclaimers in the
        general Terms of Service:
      </p>
      <ul className={ul}>
        <li>We do not guarantee any level of traffic, leads, conversions, page rank, or commercial benefit from your listing.</li>
        <li>We do not guarantee uptime, indexing, or that your listing will appear in any particular position relative to other listings.</li>
        <li>We are not responsible for the conduct, claims, or solvency of any Visitor who contacts you through the Directory.</li>
      </ul>
      <p>
        Our liability to you is limited as set out in the general Terms of
        Service (including the AED 500 aggregate cap), which applies fully to
        the vendor relationship.
      </p>

      <h2 className={h2}>8. Indemnity (vendor specific)</h2>
      <p>
        In addition to the indemnity in the general Terms of Service, you
        agree to indemnify Resolute against any claim brought by a third party
        alleging that:
      </p>
      <ul className={ul}>
        <li>Content you submitted infringes their intellectual-property, privacy, or other rights;</li>
        <li>You were not authorised to represent the product you listed;</li>
        <li>The product or its marketing as represented by you violates applicable law or regulation.</li>
      </ul>

      <h2 className={h2}>9. Changes to these Vendor Terms</h2>
      <p>
        We may update these Vendor Terms. For material changes affecting
        active vendors, we will email the contact address on your account at
        least 14 days before the new version takes effect, and we may require
        you to re-accept the updated version inside the vendor dashboard
        before continuing to use it. If you do not accept, you may close your
        account and we will remove the listing.
      </p>

      <h2 className={h2}>10. Governing law and disputes</h2>
      <p>
        These Vendor Terms are governed by the same law and dispute-resolution
        process as the general Terms of Service: laws of the{" "}
        <strong>Dubai International Financial Centre (DIFC), United Arab
        Emirates</strong>, with disputes resolved by{" "}
        <strong>arbitration administered by the DIFC-LCIA Arbitration
        Centre</strong> under the DIFC-LCIA Arbitration Rules. Seat: Dubai.
        Language: English. One arbitrator.
      </p>

      <p>
        Questions about these Vendor Terms: <strong>team@allinfratech.com</strong>.
      </p>
    </LegalShell>
  );
}
