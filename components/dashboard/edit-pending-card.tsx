import Link from "next/link";
import { Clock, ArrowRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Top-of-dashboard card for an edit-type submission in
 * pending_review. Surfaces the in-flight edit on the vendor's
 * dashboard so they know it's still with the Resolute team —
 * complements the in-page banner on the edit page itself.
 *
 * Only used for company_edit and product_edit. "new" submissions in
 * pending_review get their own "In review" status badge on the
 * listings row; adding a separate card would be redundant noise.
 *
 * Server component — no interactivity beyond the Link.
 */
export function EditPendingCard({
  headline,
  subhead,
  viewTarget,
}: {
  headline: string;
  subhead: string;
  /** Where the "View" link points — the edit page itself, which
   *  shows its own pending banner + preview when status is
   *  pending_review. */
  viewTarget: string;
}) {
  return (
    <section className="mb-10 border border-amber-300 bg-amber-50 p-6 md:p-8">
      <p className="text-[13px] uppercase tracking-[0.32em] text-amber-700">
        Edit under review
      </p>
      <h2 className="mt-3 font-heading text-[30px] leading-tight tracking-tight text-[var(--color-ink)] md:text-[34px]">
        {headline}
      </h2>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        {subhead}
      </p>

      <div className="mt-8 flex justify-end border-t border-amber-200 pt-6">
        <Link
          href={viewTarget}
          prefetch
          className="group inline-flex h-11 items-center gap-2 border border-amber-700/40 px-5 text-[14px] uppercase tracking-[0.18em] text-amber-800 transition-colors hover:bg-amber-700/10"
        >
          <Clock size={13} weight="regular" />
          View pending edit
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
