import type { Metadata } from "next";
import { LegalShell } from "@/components/site/legal-shell";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "Privacy policy for the Resolute Apps Directory.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy policy" updated="Draft &mdash; pre-launch">
      <p>
        We collect minimal data: aggregate page analytics via Plausible (no
        personal identifiers, no cross-site tracking) and form submissions you
        send us via the suggest, contact, and vendor flows.
      </p>
      <p>
        Vendor email addresses are never displayed publicly. Contact-vendor
        forms route messages through our server and never expose underlying
        addresses to scrapers.
      </p>
      <p>
        Data subject access requests can be lodged via the contact page. Full
        GDPR-compliant policy is being drafted alongside the production launch.
      </p>
    </LegalShell>
  );
}
