import Link from "next/link";
import { PencilSimple, ArrowRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Top-of-dashboard card for submissions in `rejected`. Shows the
 * admin's rejection_reason verbatim and a CTA into the wizard
 * prefilled with the previous payload (resubmit branch of
 * /dashboard/onboarding/submit).
 *
 * Server component — no interactivity beyond the Link navigation.
 * The wizard handles re-acceptance (TERMS_VERSION) on the next
 * page; if needed, the layout-mounted legal modal renders before
 * the form does.
 */
export function SubmissionRejectedCard({
  submissionId,
  productName,
  rejectionReason,
}: {
  submissionId: number;
  productName: string;
  rejectionReason: string;
}) {
  return (
    <section className="mb-10 border border-rose-300 bg-rose-50 p-6 md:p-8">
      <p className="text-[13px] uppercase tracking-[0.32em] text-rose-700">
        Submission needs changes
      </p>
      <h2 className="mt-3 font-heading text-[30px] leading-tight tracking-tight text-[var(--color-ink)] md:text-[34px]">
        We weren&rsquo;t able to publish {productName}.
      </h2>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        Here&rsquo;s what our editorial team would need addressed before
        re-review:
      </p>

      <div className="mt-6 border-l-[3px] border-rose-400 bg-white p-4 text-[16px] leading-relaxed text-[var(--color-ink)] whitespace-pre-wrap">
        {rejectionReason}
      </div>

      <div className="mt-8 flex justify-end border-t border-rose-200 pt-6">
        <Link
          href={`/dashboard/onboarding/submit?resubmit=${submissionId}`}
          prefetch
          className="group inline-flex h-11 items-center gap-2 bg-[var(--color-ink)] px-5 text-[14px] uppercase tracking-[0.18em] text-[var(--color-canvas)] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-coral)] active:translate-y-[1px]"
        >
          <PencilSimple size={13} weight="regular" />
          Edit &amp; resubmit
          <ArrowRight
            size={11}
            weight="bold"
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
}
