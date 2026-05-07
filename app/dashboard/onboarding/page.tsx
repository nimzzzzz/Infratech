import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import {
  getVendorSession,
  isDemoOverride,
} from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Welcome to InfraTechDB",
  alternates: { canonical: "/dashboard/onboarding" },
};

/**
 * Onboarding landing — confirms LinkedIn-verified company affiliation,
 * then routes the vendor straight into the submit wizard. No claim
 * branch — directory is invitation-only and listings are seeded by the
 * Resolute admin team; vendors are invited specifically to submit a NEW
 * tool against an existing vendor profile.
 */
export default async function OnboardingLandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const asParam = Array.isArray(sp.as) ? sp.as[0] : sp.as;
  const demoOverride = isDemoOverride(asParam) ? asParam : undefined;

  // Onboarding page itself — opt out of the onboarded gate or this
  // page would redirect-loop to itself. `vendor` may be null at
  // this point (fresh sign-in pre-onboarding); the welcome copy
  // below conditionally falls back to a generic phrase. B.2 swaps
  // this whole page out for the company-confirm form.
  const { vendor, user } = await getVendorSession({
    demoOverride,
    requireOnboarded: false,
  });
  const firstName = user.name.split(" ")[0];
  const companyLabel = vendor?.name ?? "your company";

  return (
    <Container className="max-w-3xl py-12 md:py-20">
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Welcome
      </p>
      <h1 className="mt-5 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[56px]">
        Welcome to InfratechDatabase, {firstName}.
      </h1>
      <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        We&rsquo;ve verified you with LinkedIn as part of{" "}
        <strong className="font-medium text-[var(--color-ink)]">
          {companyLabel}
        </strong>
        . Let&rsquo;s get your product on the directory.
      </p>

      <ul className="mt-12 space-y-4">
        <li>
          <Link
            href="/dashboard/onboarding/submit"
            className="group relative grid grid-cols-[auto_1fr_auto] items-start gap-5 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 transition-colors hover:border-[var(--color-ink)]/40 md:p-8"
          >
            <span className="grid h-12 w-12 place-items-center bg-[var(--color-canvas)] text-[var(--color-ink)] ring-1 ring-[var(--color-line-strong)]">
              <Plus size={20} weight="regular" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
                Submit a new product
              </p>
              <p className="mt-2 font-heading text-[22px] leading-tight tracking-tight md:text-[26px]">
                Add your tool to the directory.
              </p>
              <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ink-2)]">
                Three short steps to set up your company profile and submit
                your first product. We&rsquo;ll review and email you when it
                goes live, usually within two business days.
              </p>
            </div>
            <ArrowRight
              size={18}
              weight="regular"
              className="mt-2 text-[var(--color-ink-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]"
            />
          </Link>
        </li>
      </ul>

      <p className="mt-12 max-w-[60ch] text-[13px] leading-relaxed text-[var(--color-ink-3)]">
        Just looking around?{" "}
        <Link
          href="/"
          className="underline underline-offset-4 hover:text-[var(--color-ink)]"
        >
          Browse the directory
        </Link>
        .
      </p>
    </Container>
  );
}
