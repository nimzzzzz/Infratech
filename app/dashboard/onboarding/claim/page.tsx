import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { ClaimSearch } from "@/components/dashboard/claim-search";
import { getMockSession } from "@/lib/auth/mock-session";

export const metadata: Metadata = {
  title: "Claim a listing",
  alternates: { canonical: "/dashboard/onboarding/claim" },
};

export default function ClaimPage() {
  const { company } = getMockSession();

  return (
    <Container className="max-w-3xl py-12 md:py-16">
      <Link
        href="/dashboard/onboarding"
        className="group inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft
          size={12}
          weight="bold"
          className="transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        Back
      </Link>

      <p className="mt-8 text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Path A &middot; Claim a listing
      </p>
      <h1 className="mt-4 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[52px]">
        Find {company.name}&rsquo;s listing.
      </h1>
      <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        Search the directory for your product. If we&rsquo;ve already catalogued
        it as an editorial stub, request to claim it. We&rsquo;ll cross-check
        your LinkedIn affiliation against the vendor before transferring.
      </p>

      <div className="mt-10">
        <ClaimSearch />
      </div>
    </Container>
  );
}
