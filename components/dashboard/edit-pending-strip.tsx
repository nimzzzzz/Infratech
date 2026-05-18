import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Thin status strip for an edit-type submission in pending_review.
 * Sits inside the "Your listings" section at the top (above the
 * listing rows), or above the empty-state component when a vendor
 * has no published listings yet. Replaces the prior EditPendingCard
 * which was a heavy banner at the top of the dashboard.
 *
 * Only renders for company_edit and product_edit. "new" submissions
 * in pending_review get their own "In review" status badge on the
 * listings row and don't need a separate strip.
 *
 * Server component — no interactivity beyond the Link.
 */
export function EditPendingStrip({
  message,
  viewTarget,
}: {
  /** Body text already composed by the caller (includes the
   *  product / company name as appropriate). Strings are passed as
   *  ReactNode so the caller can emphasise the name with a span. */
  message: React.ReactNode;
  /** Where the "View →" link points — the edit page itself, which
   *  shows the in-page pending banner + a preview from the pending
   *  payload. */
  viewTarget: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
        />
        <p className="truncate text-[14px] text-amber-900">{message}</p>
      </div>
      <Link
        href={viewTarget}
        prefetch
        className="group inline-flex shrink-0 items-center gap-1 text-[13px] uppercase tracking-[0.18em] text-amber-800 hover:text-amber-900"
      >
        View
        <ArrowRight
          size={11}
          weight="bold"
          className="transition-transform duration-300 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}
