import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { getVendorSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Submission received",
  alternates: { canonical: "/dashboard/onboarding/submitted" },
};

/**
 * Confirmation page rendered after a successful POST /api/submissions.
 *
 * Personalised with the product name (from the ?name= query param,
 * round-tripped from the wizard) and the signed-in user's
 * primary_email. The wizard's handleSubmit pushes to:
 *
 *   /dashboard/onboarding/submitted?name=<URL-encoded product name>
 *
 * Two CTAs: back to dashboard, or submit another product.
 */
export default async function OnboardingSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawName = Array.isArray(sp.name) ? sp.name[0] : sp.name;
  // Trim + cap the rendered name. The Zod schema already caps at 200,
  // but defence-in-depth — query params arrive untrusted.
  const productName =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim().slice(0, 200)
      : null;

  // Open shape — at this point the wizard has just submitted, so the
  // vendor + onboarded flags should both be set. Open shape tolerates
  // the edge case where someone direct-navigates here without state.
  const { vendorMember } = await getVendorSession({ requireOnboarded: false });

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
      <p className="mx-auto mt-5 max-w-[58ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        {productName ? (
          <>
            Your product{" "}
            <span className="text-[var(--color-ink)]">
              &ldquo;{productName}&rdquo;
            </span>{" "}
            has been submitted for review by AllInfratech.
          </>
        ) : (
          <>Your submission has been received by AllInfratech.</>
        )}{" "}
        We&rsquo;ll notify{" "}
        <span className="text-[var(--color-ink)]">
          {vendorMember.primaryEmail}
        </span>{" "}
        once it&rsquo;s published, typically within two business days.
      </p>

      <div className="mx-auto mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/dashboard"
          prefetch
          className="group inline-flex h-11 items-center justify-center gap-1.5 border border-[var(--color-line-strong)] bg-transparent px-5 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]"
        >
          View dashboard
          <ArrowRight
            size={11}
            weight="bold"
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </Link>
        <Link
          href="/dashboard/onboarding/submit?as=returning"
          prefetch
          className="group inline-flex h-11 items-center justify-center gap-1.5 bg-[var(--color-ink)] px-5 text-[12px] uppercase tracking-[0.18em] text-[var(--color-canvas)] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-coral)] active:translate-y-[1px]"
        >
          <Plus size={11} weight="bold" />
          Submit another product
        </Link>
      </div>
    </Container>
  );
}
