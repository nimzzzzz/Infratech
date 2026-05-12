import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { SubmitWizard } from "@/components/dashboard/submit-wizard";
import {
  getVendorSession,
  isDemoOverride,
} from "@/lib/auth/session";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";

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

/**
 * Map a stored submission payload to the wizard's FormState shape
 * for resubmit prefill. The payload JSONB and the FormState type
 * share most field names; this adapter handles the type-narrowing
 * + the customCapabilities/customIndustries/customPricing
 * conventions the wizard expects.
 */
type WizardPrefillValues = {
  name?: string;
  url?: string;
  tagline?: string;
  description?: string;
  stages?: string[];
  capabilities?: string[];
  industries?: string[];
  pricing?: string;
  customCapabilities?: string[];
  customIndustries?: string[];
  customPricing?: string;
};

function payloadToWizardValues(
  payload: unknown,
): WizardPrefillValues {
  const p = (payload ?? {}) as Record<string, unknown>;
  const str = (k: string): string | undefined =>
    typeof p[k] === "string" ? (p[k] as string) : undefined;
  const arr = (k: string): string[] | undefined =>
    Array.isArray(p[k]) && (p[k] as unknown[]).every((x) => typeof x === "string")
      ? (p[k] as string[])
      : undefined;
  return {
    name: str("name"),
    url: str("url"),
    tagline: str("tagline"),
    description: str("description"),
    stages: arr("stages"),
    capabilities: arr("capabilities"),
    industries: arr("industries"),
    pricing: str("pricing"),
    customCapabilities: arr("customCapabilities"),
    customIndustries: arr("customIndustries"),
    customPricing: str("customPricing"),
  };
}

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const asParam = Array.isArray(sp.as) ? sp.as[0] : sp.as;
  const resubmitParam = Array.isArray(sp.resubmit)
    ? sp.resubmit[0]
    : sp.resubmit;
  const demoOverride = isDemoOverride(asParam) ? asParam : undefined;
  // Onboarding flow — opt out of the onboarded gate (the gate would
  // bounce a not-yet-onboarded vendor back to /dashboard/onboarding,
  // and an already-onboarded vendor reaches this page from /dashboard
  // anyway via the "Submit new product" CTA).
  const { vendor, vendorMember } = await getVendorSession({
    demoOverride,
    requireOnboarded: false,
  });

  // Phase A.2 PR 2 — resubmit branch. Loads the rejected submission
  // server-side, verifies ownership, and seeds the wizard with the
  // previous payload. Wizard's POST target is overridden to
  // /api/submissions/:id/resubmit so the existing rejected row gets
  // updated in place rather than a fresh row being inserted.
  let resubmitId: number | null = null;
  let resubmitValues: WizardPrefillValues | undefined;
  if (resubmitParam) {
    const id = Number(resubmitParam);
    if (!Number.isFinite(id) || id <= 0) {
      redirect("/dashboard?error=invalid_resubmit");
    }
    if (!vendor) {
      // No vendor row yet — can't own a submission. Bounce.
      redirect("/dashboard");
    }
    const [row] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);
    if (!row) redirect("/dashboard?error=submission_not_found");
    if (row.submitterVendorId !== vendor.id) {
      // Ownership mismatch — silent redirect, no info leak. The
      // dashboard's rejected card is the only entry point for
      // this URL, so the user shouldn't legitimately land here
      // for a submission they don't own.
      redirect("/dashboard");
    }
    if (row.status !== "rejected") {
      redirect("/dashboard?error=not_resubmittable");
    }
    resubmitId = row.id;
    resubmitValues = payloadToWizardValues(row.payload);
  }

  // ?as=returning → skips the "Your company" step (vendor profile
  // already on file). Otherwise: skip iff a vendor row already
  // exists. The previous heuristic used `vendorMember.onboarded`,
  // which is wrong post-B.1 schema split — `onboarded` now means
  // "accepted legal terms", which is independent of "has a vendor
  // row" (the modal can be accepted before the wizard runs).
  // On resubmit the company step is always skipped — the vendor
  // already has a vendor row (we verified ownership above).
  const skipCompanyStep =
    resubmitId !== null || asParam === "returning" || vendor != null;

  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={resubmitId !== null ? "/dashboard" : "/dashboard/onboarding"}
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

      {resubmitId !== null ? (
        <p className="mt-6 text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
          Editing rejected submission · resubmit when ready
        </p>
      ) : null}

      <SubmitWizard
        prefill={{
          vendor: vendor?.name ?? "",
          domain: vendor ? domainFrom(vendor.websiteUrl) : "",
        }}
        skipCompanyStep={skipCompanyStep}
        initialValues={resubmitValues}
        submitUrl={
          resubmitId !== null
            ? `/api/submissions/${resubmitId}/resubmit`
            : undefined
        }
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
