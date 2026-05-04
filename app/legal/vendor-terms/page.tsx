import type { Metadata } from "next";
import { LegalShell } from "@/components/site/legal-shell";

export const metadata: Metadata = {
  title: "Vendor terms",
  description: "Terms for vendors listed in the Resolute Apps Directory.",
  alternates: { canonical: "/legal/vendor-terms" },
};

export default function VendorTermsPage() {
  return (
    <LegalShell title="Vendor terms" updated="Draft &mdash; pre-launch">
      <p>
        Vendors with a published listing may claim and manage their entry once
        the self-service flow is live (phase 2). Listings are free; the
        directory does not accept paid placements.
      </p>
      <p>
        Vendors are responsible for the accuracy of submitted descriptions,
        screenshots, and external links. The editorial team reserves the right
        to copy-edit, reject misleading content, or remove a listing for cause.
      </p>
    </LegalShell>
  );
}
