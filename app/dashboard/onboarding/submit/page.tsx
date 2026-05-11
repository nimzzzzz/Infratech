import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { SubmitWizard } from "@/components/dashboard/submit-wizard";
import {
  getVendorSession,
  isDemoOverride,
} from "@/lib/auth/session";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Submit a product",
  alternates: { canonical: "/dashboard/onboarding/submit" },
};

function domainFrom(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const asParam = Array.isArray(sp.as) ? sp.as[0] : sp.as;
  const demoOverride = isDemoOverride(asParam) ? asParam : undefined;
  // Onboarding flow — opt out of the onboarded gate (the gate would
  // bounce a not-yet-onboarded vendor back to /dashboard/onboarding,
  // and an already-onboarded vendor reaches this page from /dashboard
  // anyway via the "Submit new product" CTA).
  const { vendor, vendorMember } = await getVendorSession({
    demoOverride,
    requireOnboarded: false,
  });

  // Phase B.2 PR 2 — vendor-less users are now welcome here. The
  // wizard's CompanyStep collects the company info and the submit
  // endpoint creates the vendors row + submission in one transaction.
  // The previous redirect-to-/dashboard/onboarding bounce was the
  // root cause of the post-D.2 fresh-signup loop (see PR 1 audit).

  // ?as=returning → skips the "Your company" step (vendor profile
  // already on file). Otherwise: skip iff a vendor row already
  // exists. The previous heuristic used `vendorMember.onboarded`,
  // which is wrong post-B.1 schema split — `onboarded` now means
  // "accepted legal terms", which is independent of "has a vendor
  // row" (the modal can be accepted before the wizard runs).
  const skipCompanyStep = asParam === "returning" || vendor != null;

  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <div className="flex items-center justify-between gap-4">
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

        {env.DEMO_MODE ? (
          <DemoToggle skipCompanyStep={skipCompanyStep} />
        ) : null}
      </div>

      <SubmitWizard
        prefill={{
          vendor: vendor?.name ?? "",
          domain: vendor ? domainFrom(vendor.websiteUrl) : "",
        }}
        skipCompanyStep={skipCompanyStep}
      />
    </Container>
  );
}

function DemoToggle({ skipCompanyStep }: { skipCompanyStep: boolean }) {
  return (
    <div className="inline-flex items-center gap-1 border border-dashed border-[var(--color-line-strong)] bg-[var(--color-canvas-warm)]/40 p-1 text-[10px] uppercase tracking-[0.18em]">
      <span className="px-2 text-[var(--color-ink-3)]">Demo as</span>
      <Link
        href="/dashboard/onboarding/submit"
        className={cn(
          "px-3 py-1 transition-colors",
          !skipCompanyStep
            ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
            : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
        )}
      >
        New vendor
      </Link>
      <Link
        href="/dashboard/onboarding/submit?as=returning"
        className={cn(
          "px-3 py-1 transition-colors",
          skipCompanyStep
            ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
            : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
        )}
      >
        Returning
      </Link>
    </div>
  );
}
