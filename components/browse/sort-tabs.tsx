"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildHref, parseFilters, type SortKey } from "@/lib/browse/filters";
import { cn } from "@/lib/utils";

const tabs: { key: SortKey; label: string }[] = [
  { key: "az", label: "A → Z" },
  { key: "recent", label: "Recently added" },
  { key: "featured", label: "Featured" },
];

export function SortTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const state = parseFilters(Object.fromEntries(search.entries()));

  return (
    <div className="inline-flex items-center gap-0 border border-[var(--color-line-strong)]">
      {tabs.map((t, i) => {
        const active = state.sort === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() =>
              router.push(buildHref(pathname, state, { sort: t.key }), {
                scroll: false,
              })
            }
            className={cn(
              "px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors",
              active
                ? "bg-[var(--color-ink)] text-white"
                : "bg-transparent text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
              i > 0 && "border-l border-[var(--color-line-strong)]",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
