/**
 * Skeleton placeholder for the dashboard header while the layout's
 * Suspense boundary resolves session + unread count. Mirrors the
 * real DashboardHeader's height (64px / md:72px) so the page
 * doesn't shift when the real header swaps in.
 *
 * No interactive elements — the real header's links/buttons appear
 * on hydration along with the real chrome. Uses the same canvas /
 * line-strong tokens + animate-pulse pattern as the page-level
 * loading skeletons.
 */
export function DashboardHeaderSkeleton() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur-md"
      aria-busy="true"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6 md:h-18 md:px-8">
        <div className="flex animate-pulse items-center gap-5">
          {/* wordmark placeholder */}
          <div className="h-5 w-36 bg-[var(--color-line-strong)]/30" />
          {/* nav placeholders — hidden on mobile to match the real
              header's md:block on its nav */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="h-3 w-16 bg-[var(--color-line-strong)]/20" />
            <div className="h-3 w-20 bg-[var(--color-line-strong)]/20" />
          </div>
        </div>
        <div className="flex animate-pulse items-center gap-3">
          {/* browse-directory link placeholder, sm:inline-flex */}
          <div className="hidden h-3 w-24 bg-[var(--color-line-strong)]/20 sm:block" />
          {/* user pill avatar circle, sm:flex */}
          <div className="hidden h-8 w-8 rounded-full bg-[var(--color-line-strong)]/30 sm:block" />
          {/* sign-out button placeholder */}
          <div className="h-9 w-20 bg-[var(--color-line-strong)]/30" />
        </div>
      </div>
    </header>
  );
}
