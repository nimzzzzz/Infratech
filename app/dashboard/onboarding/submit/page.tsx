import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { SubmitWizard } from "@/components/dashboard/submit-wizard";
import { getMockSession } from "@/lib/auth/mock-session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Submit a product",
  alternates: { canonical: "/dashboard/onboarding/submit" },
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const session = getMockSession();
  // ?as=returning  → skips the "Your company" step (vendor profile already on file)
  const skipCompanyStep = sp.as === "returning";

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

        {/* Demo-only toggle — lets the reviewer flip between the two paths
            without needing two real vendor accounts. Remove for production. */}
        <DemoToggle skipCompanyStep={skipCompanyStep} />
      </div>

      <SubmitWizard
        prefill={{
          vendor: session.company.name,
          domain: session.company.domain,
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
