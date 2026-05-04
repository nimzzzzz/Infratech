"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { buildHref, parseFilters } from "@/lib/browse/filters";

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const state = parseFilters(Object.fromEntries(search.entries()));
  const [value, setValue] = useState(state.q);

  // sync local state when URL changes (e.g. clear-all elsewhere)
  useEffect(() => setValue(state.q), [state.q]);

  // debounced URL push
  useEffect(() => {
    if (value === state.q) return;
    const t = setTimeout(() => {
      router.push(buildHref(pathname, state, { q: value }), { scroll: false });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="relative flex h-12 w-full items-center border border-[var(--color-line-strong)] bg-[var(--color-surface)] focus-within:border-[var(--color-ink)]">
      <MagnifyingGlass
        size={16}
        weight="regular"
        className="ml-4 shrink-0 text-[var(--color-ink-3)]"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name, capability, or vendor…"
        className="h-full w-full bg-transparent px-3 text-[16px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none"
        aria-label="Search the directory"
      />
      <kbd className="num mr-3 hidden shrink-0 items-center gap-1 border border-[var(--color-line-strong)] px-2 py-0.5 text-[11px] text-[var(--color-ink-3)] sm:inline-flex">
        <span>⌘</span>
        <span>K</span>
      </kbd>
    </label>
  );
}
