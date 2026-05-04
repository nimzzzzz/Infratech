import type { Metadata } from "next";
import { LegalShell } from "@/components/site/legal-shell";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Cookie policy for the Resolute Apps Directory.",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalShell title="Cookies" updated="Draft &mdash; pre-launch">
      <p>
        We use Plausible Analytics, a privacy-friendly product that does not set
        cookies, does not track users across sites, and aggregates all data.
        For most visitors, no cookies are set at all.
      </p>
      <p>
        Authenticated areas (vendor dashboard, admin panel) require session
        cookies for sign-in. Those cookies are first-party, HTTP-only, and
        scoped to the relevant route.
      </p>
    </LegalShell>
  );
}
