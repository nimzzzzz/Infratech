"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "@phosphor-icons/react";
import {
  buildHref,
  parseFilters,
  toggleInArray,
  type FilterKey,
} from "@/lib/browse/filters";
import { stageNameMap } from "@/lib/data/stages";
import { lookups } from "@/lib/data/taxonomy";

const labelFor = (category: FilterKey, slug: string): string => {
  if (category === "stage") return stageNameMap.get(slug) ?? slug;
  if (category === "capability") return lookups.capability.get(slug) ?? slug;
  if (category === "pricing") return lookups.pricing.get(slug) ?? slug;
  return lookups.industry.get(slug) ?? slug;
};

export function ActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const state = parseFilters(Object.fromEntries(search.entries()));

  const chips: { category: FilterKey; slug: string }[] = [
    ...state.stage.map((slug) => ({ category: "stage" as const, slug })),
    ...state.capability.map((slug) => ({ category: "capability" as const, slug })),
    ...state.pricing.map((slug) => ({ category: "pricing" as const, slug })),
    ...state.industry.map((slug) => ({ category: "industry" as const, slug })),
  ];

  if (chips.length === 0 && !state.q) return null;

  const clearAll = () =>
    router.push(
      buildHref(pathname, state, {
        q: "",
        stage: [],
        capability: [],
        pricing: [],
        industry: [],
      }),
      { scroll: false },
    );

  const remove = (category: FilterKey, slug: string) =>
    router.push(
      buildHref(pathname, state, {
        [category]: toggleInArray(state[category], slug),
      }),
      { scroll: false },
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state.q ? (
        <button
          type="button"
          onClick={() =>
            router.push(buildHref(pathname, state, { q: "" }), { scroll: false })
          }
          className="group inline-flex items-center gap-2 bg-[var(--color-ink)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white"
        >
          <span>{`"${state.q}"`}</span>
          <X size={10} weight="bold" className="opacity-70 group-hover:opacity-100" />
        </button>
      ) : null}
      {chips.map((c) => (
        <button
          key={`${c.category}:${c.slug}`}
          type="button"
          onClick={() => remove(c.category, c.slug)}
          className="group inline-flex items-center gap-2 bg-[var(--color-ink)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white"
        >
          <span>{labelFor(c.category, c.slug)}</span>
          <X size={10} weight="bold" className="opacity-70 group-hover:opacity-100" />
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="ml-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink)] underline underline-offset-4 hover:text-[var(--color-magenta)]"
      >
        Clear all
      </button>
    </div>
  );
}
