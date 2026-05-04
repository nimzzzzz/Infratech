"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check } from "@phosphor-icons/react";
import {
  buildHref,
  parseFilters,
  toggleInArray,
  type FilterKey,
} from "@/lib/browse/filters";
import { cn } from "@/lib/utils";
import type { TaxonomyItem } from "@/lib/data/taxonomy";

export function FilterSection({
  title,
  category,
  options,
  counts,
  searchable = false,
  scrollable = false,
}: {
  title: string;
  category: FilterKey;
  options: TaxonomyItem[];
  counts: Record<string, number>;
  searchable?: boolean;
  scrollable?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const state = parseFilters(Object.fromEntries(search.entries()));
  const selected = state[category];

  const [innerQuery, setInnerQuery] = useState("");

  const visible = useMemo(() => {
    if (!searchable || !innerQuery) return options;
    const needle = innerQuery.toLowerCase();
    return options.filter((o) => o.name.toLowerCase().includes(needle));
  }, [options, searchable, innerQuery]);

  const toggle = (slug: string) =>
    router.push(
      buildHref(pathname, state, {
        [category]: toggleInArray(selected, slug),
      }),
      { scroll: false },
    );

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--color-line-strong)] pb-3">
        <h3 className="text-[12px] uppercase tracking-[0.22em] text-[var(--color-ink)]">
          {title}
        </h3>
        <span className="num text-[12px] text-[var(--color-ink-3)]">
          {String(options.length).padStart(2, "0")}
        </span>
      </div>

      {searchable ? (
        <input
          type="search"
          value={innerQuery}
          onChange={(e) => setInnerQuery(e.target.value)}
          placeholder="Filter capabilities…"
          className="mt-3 h-10 w-full border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
          aria-label={`Filter ${title.toLowerCase()}`}
        />
      ) : null}

      <ul
        className={cn(
          "mt-2 space-y-0.5",
          scrollable && "max-h-[260px] overflow-y-auto pr-1",
        )}
      >
        {visible.map((opt) => {
          const checked = selected.includes(opt.slug);
          const count = counts[opt.slug] ?? 0;
          const disabled = count === 0 && !checked;
          return (
            <li key={opt.slug}>
              <button
                type="button"
                onClick={() => toggle(opt.slug)}
                disabled={disabled}
                className={cn(
                  "group flex w-full items-center justify-between gap-3 px-1 py-1.5 text-left transition-colors",
                  disabled && "cursor-not-allowed opacity-40",
                  !disabled && "hover:text-[var(--color-ink)]",
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center border transition-colors",
                      checked
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                        : "border-[var(--color-line-strong)] bg-transparent group-hover:border-[var(--color-ink)]",
                    )}
                  >
                    {checked ? <Check size={10} weight="bold" /> : null}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[14px]",
                      checked
                        ? "text-[var(--color-ink)]"
                        : "text-[var(--color-ink-2)]",
                    )}
                  >
                    {opt.name}
                  </span>
                </span>
                <span className="num shrink-0 text-[12px] text-[var(--color-ink-3)]">
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
