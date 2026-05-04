import type { Metadata } from "next";
import { LegalShell } from "@/components/site/legal-shell";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms of use for the Resolute Apps Directory.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of use" updated="Draft &mdash; pre-launch">
      <p>
        These terms govern access to and use of the directory. They will be
        finalised before public launch in coordination with legal counsel.
      </p>
      <p>
        The directory is published for reference only. Listings reflect
        publicly-available information at the time of writing and are not
        endorsements. Always evaluate fit-for-purpose against your project&rsquo;s
        constraints before committing to a product.
      </p>
    </LegalShell>
  );
}
