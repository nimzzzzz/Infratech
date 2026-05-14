import Link from "next/link";
import { ArrowRight, Plus, Stack } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { relativeDays } from "@/lib/browse/dates";
import { cn } from "@/lib/utils";

/**
 * Dashboard empty state — rendered when a vendor exists but has no
 * published listings yet. Two flavours rendered in the same place:
 *
 *   • pendingSubmissions.length === 0 → "Welcome, submit your first
 *     product" call-to-action. The user has confirmed a company but
 *     hasn't started a submission.
 *
 *   • pendingSubmissions.length > 0 → "Your submission is under
 *     review" with a list of the queue entries. The user has
 *     submitted and is waiting on editorial.
 *
 * Replaces the pre-PR-2 redirect-to-/dashboard/onboarding bounce.
 * Empty-state preserves the user's choice of route (they typed
 * /dashboard, they get /dashboard) instead of teleporting them away.
 */
export type PendingSubmissionSummary = {
  id: number;
  /** Post-Phase-A.2: `pending_review` replaces the legacy `pending`.
   *  The legacy `in_review` enum value stays in the schema but no
   *  writer emits it post-A.2; included here for completeness. */
  status: "pending_review" | "in_review";
  submittedAt: Date;
  productName: string;
};

export function DashboardEmptyState({
  firstName,
  vendorName,
  pendingSubmissions,
}: {
  firstName: string;
  vendorName: string;
  pendingSubmissions: PendingSubmissionSummary[];
}) {
  const hasPending = pendingSubmissions.length > 0;

  return (
    <Container className="max-w-3xl py-16 md:py-24">
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Vendor dashboard
      </p>
      <h1 className="mt-4 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[48px]">
        {hasPending
          ? `Hang tight, ${firstName}.`
          : `Welcome, ${firstName}.`}
      </h1>
      <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-[var(--color-ink-2)] md:text-[16px]">
        {hasPending
          ? `${vendorName}'s submission is in the editorial review queue. We'll email you within two business days — either with a publish confirmation or with specific edits we'd like before going live.`
          : `${vendorName} doesn't have a published listing yet. Submit your first product when you're ready — editorial review usually takes two business days.`}
      </p>

      {hasPending ? (
        <section className="mt-12">
          <header className="border-b border-[var(--color-line-strong)] pb-3">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
              In review
            </h2>
          </header>
          <ul className="divide-y divide-[var(--color-line)]">
            {pendingSubmissions.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 md:px-3"
              >
                <span
                  aria-hidden
                  className="grid h-10 w-10 place-items-center bg-[var(--color-canvas-warm)] text-[var(--color-coral)] ring-1 ring-[var(--color-line-strong)]"
                >
                  <Stack size={16} weight="regular" />
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-[20px] leading-tight">
                    {s.productName}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
                    Submitted{" "}
                    <span className="num">
                      {
                        relativeDays(s.submittedAt.toISOString().slice(0, 10))
                          .label
                      }
                    </span>
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ring-1",
                    "bg-[var(--color-coral)]/10 text-[var(--color-coral)] ring-[var(--color-coral)]/40",
                  )}
                >
                  {s.status === "pending_review" ? "In queue" : "In review"}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10 border-t border-[var(--color-line)] pt-6">
            <Link
              href="/dashboard/onboarding/submit?as=returning"
              prefetch
              className="group inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
            >
              <Plus size={11} weight="bold" />
              Submit another product
              <ArrowRight
                size={11}
                weight="bold"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </section>
      ) : (
        <div className="mt-12">
          <Link
            href="/dashboard/onboarding/submit?as=returning"
            prefetch
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
                Three short steps. We&rsquo;ll review and email you when it
                goes live, usually within two business days.
              </p>
            </div>
            <ArrowRight
              size={18}
              weight="regular"
              className="mt-2 text-[var(--color-ink-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]"
            />
          </Link>
        </div>
      )}
    </Container>
  );
}
