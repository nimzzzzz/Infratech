/**
 * Skeleton placeholder for the admin header while the layout's
 * Suspense boundary resolves the admin session. Mirrors the real
 * AdminHeader's height (64px / md:72px) so the page doesn't shift
 * when the real header swaps in.
 */
export function AdminHeaderSkeleton() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur-md"
      aria-busy="true"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6 md:h-18 md:px-8">
        <div className="flex animate-pulse items-center gap-4">
          {/* wordmark + admin badge placeholder */}
          <div className="h-5 w-32 bg-[var(--color-line-strong)]/30" />
          <div className="hidden h-4 w-12 bg-[var(--color-magenta)]/30 md:block" />
          {/* nav placeholders */}
          <div className="ml-3 hidden items-center gap-3 md:flex">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-3 w-16 bg-[var(--color-line-strong)]/20"
              />
            ))}
          </div>
        </div>
        <div className="flex animate-pulse items-center gap-3">
          {/* user pill avatar circle, sm:flex */}
          <div className="hidden h-8 w-8 rounded-full bg-[var(--color-line-strong)]/30 sm:block" />
          {/* preview-vendor + sign-out button placeholders */}
          <div className="h-9 w-24 bg-[var(--color-line-strong)]/20" />
          <div className="h-9 w-20 bg-[var(--color-line-strong)]/30" />
        </div>
      </div>
    </header>
  );
}
