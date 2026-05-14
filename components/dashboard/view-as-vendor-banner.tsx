import { Warning, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { exitVendorView } from "@/lib/admin/view-as-vendor";

/**
 * Persistent "you're impersonating" banner. Mounted by the
 * dashboard layout when an admin has the view_as_vendor cookie
 * set. Server component — the only interactivity is the form
 * action that clears the cookie + redirects to /admin.
 *
 * Visual treatment: amber strip (matches the vendor-feedback
 * banner inside admin submission detail; "amber = review me"
 * convention across the app). Sticky-pinned with z-50 so it
 * stays visible during scroll — signals "this is unusual,
 * you're impersonating" persistently rather than scrolling away.
 */
export function ViewAsVendorBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-5 py-2.5 sm:flex-row sm:items-center sm:px-6 md:px-8">
        <p className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-amber-900">
          <Warning size={13} weight="fill" />
          Admin &middot; viewing as a vendor for QA
        </p>
        <form action={exitVendorView}>
          <button
            type="submit"
            className="group inline-flex h-9 items-center gap-1.5 bg-[var(--color-ink)] px-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-canvas)] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-coral)] active:translate-y-[1px] sm:h-8"
          >
            Return to admin view
            <ArrowRight
              size={11}
              weight="bold"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </button>
        </form>
      </div>
    </div>
  );
}
