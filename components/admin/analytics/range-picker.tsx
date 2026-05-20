import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Range } from "@/lib/queries/analytics";

/**
 * Date range picker for /admin/analytics. Renders 4 server-rendered
 * `<Link>` tabs (7d / 30d / 90d / all-time). Active tab styled
 * inline; non-active tabs are plain text.
 *
 * URL-driven — clicking a tab navigates to `/admin/analytics?range=…`;
 * server component re-renders with new data. Matches the pattern
 * used by /admin/submissions tabs (no client JS, no router.replace).
 */
const OPTIONS: { value: Range; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

export function RangePicker({ active }: { active: Range }) {
  return (
    <nav
      aria-label="Date range"
      className="inline-flex border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-1"
    >
      {OPTIONS.map((opt) => {
        const isActive = opt.value === active;
        return (
          <Link
            key={opt.value}
            href={`/admin/analytics?range=${opt.value}`}
            prefetch
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center justify-center px-3 text-[13px] uppercase tracking-[0.18em] transition-colors",
              isActive
                ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
                : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
            )}
          >
            {opt.label}
          </Link>
        );
      })}
    </nav>
  );
}
