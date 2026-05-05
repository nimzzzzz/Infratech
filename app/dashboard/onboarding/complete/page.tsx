import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";

export const metadata: Metadata = {
  title: "Submission received",
  alternates: { canonical: "/dashboard/onboarding/complete" },
};

export default function OnboardingCompletePage() {
  return (
    <Container className="max-w-2xl py-16 text-center md:py-24">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-canvas-warm)] text-[var(--color-coral)] ring-1 ring-[var(--color-line-strong)]">
        <CheckCircle size={28} weight="regular" />
      </span>
      <p className="mt-8 text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Submitted &middot; In review
      </p>
      <h1 className="mt-5 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[56px]">
        Thanks. We&rsquo;ll take it from here.
      </h1>
      <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        Your submission is in the editorial review queue. We&rsquo;ll email you
        within two business days &mdash; either with a publish confirmation or
        with specific edits we&rsquo;d like before going live.
      </p>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/"
          className="group inline-flex h-12 items-center gap-2 bg-[var(--color-ink)] px-5 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-canvas)] transition active:translate-y-[1px]"
        >
          <span>Browse the directory</span>
          <ArrowRight
            size={13}
            weight="bold"
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </Link>
        <Link
          href="/dashboard/onboarding"
          className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
        >
          Submit another
        </Link>
      </div>

      <p className="mx-auto mt-16 max-w-[52ch] text-[12px] leading-relaxed text-[var(--color-ink-3)]">
        Once the listing is live, you&rsquo;ll be able to edit it, add
        screenshots, and see basic engagement metrics from your dashboard.
      </p>
    </Container>
  );
}
