import { Container } from "@/components/site/container";

/**
 * Loading state for /dashboard/messages (inbox). Mirrors the
 * eyebrow + H1 + filter-tab pair + list-of-rows silhouette.
 */
export default function MessagesLoading() {
  return (
    <Container className="max-w-6xl py-10 md:py-14">
      <div className="animate-pulse">
        <div className="h-3 w-16 bg-[var(--color-line-strong)]/40" />
        <div className="mt-4 h-12 w-2/3 bg-[var(--color-line-strong)]/40 md:h-14" />
        <div className="mt-3 h-4 w-3/4 bg-[var(--color-line-strong)]/30" />

        <div className="mt-8 flex flex-wrap gap-2 border border-[var(--color-line-strong)] p-1">
          <div className="h-8 w-20 bg-[var(--color-line-strong)]/30" />
          <div className="h-8 w-24 bg-[var(--color-line-strong)]/20" />
        </div>

        <ul className="mt-6 border-y border-[var(--color-line)] divide-y divide-[var(--color-line)]">
          {[0, 1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-5 md:px-3"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--color-line-strong)]/30" />
              <div>
                <div className="h-4 w-3/4 bg-[var(--color-line-strong)]/30" />
                <div className="mt-2 h-3 w-1/2 bg-[var(--color-line-strong)]/20" />
              </div>
              <div className="h-3 w-12 bg-[var(--color-line-strong)]/20" />
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
