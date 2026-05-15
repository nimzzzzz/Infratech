"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CaretRight, Check } from "@phosphor-icons/react";
import {
  buildHref,
  parseFilters,
  toggleInArray,
} from "@/lib/browse/filters";
import { stages } from "@/lib/data/stages";
import { formatStageLabel } from "@/lib/stages/format";
import { cn } from "@/lib/utils";

/**
 * Promotes the Stage filter (the directory's primary axis per CLAUDE.md §4)
 * out of the sidebar / drawer into a horizontal chip row below the search
 * bar. URL-state driven — same toggle logic as FilterSection, just a
 * different visual treatment.
 *
 * Mobile-only scroll indicator: a thin track + animated thumb beneath the
 * chips signals "swipe for more options" when the row overflows.
 */
export function StageQuickFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const state = parseFilters(Object.fromEntries(search.entries()));
  const selected = state.stage;

  const scrollRef = useRef<HTMLUListElement>(null);
  const [scrollState, setScrollState] = useState({
    thumbWidth: 100,
    thumbLeft: 0,
    overflow: false,
    atEnd: false,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const overflow = scrollWidth > clientWidth + 1;
      const thumbWidth = overflow
        ? Math.max(20, (clientWidth / scrollWidth) * 100)
        : 100;
      const thumbLeft = overflow
        ? (scrollLeft / scrollWidth) * 100
        : 0;
      const atEnd = !overflow || scrollLeft >= scrollWidth - clientWidth - 1;
      setScrollState({ thumbWidth, thumbLeft, overflow, atEnd });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const toggle = (slug: string) =>
    router.push(
      buildHref(pathname, state, {
        stage: toggleInArray(selected, slug),
      }),
      { scroll: false },
    );

  return (
    <div className="-mx-6 sm:-mx-6 md:mx-0">
      <p className="mb-3 px-6 text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)] md:px-0">
        Filter by stage
      </p>

      {/* chips — horizontal scroll on mobile, wrap on desktop */}
      <div className="relative">
        <ul
          ref={scrollRef}
          className="flex snap-x gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
          role="list"
        >
          {stages.map((stage) => {
            const checked = selected.includes(stage.slug);
            return (
              <li key={stage.slug} className="snap-start shrink-0">
                <button
                  type="button"
                  onClick={() => toggle(stage.slug)}
                  aria-pressed={checked}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 border px-3 text-[15px] transition-colors",
                    checked
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]"
                      : "border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink)]",
                  )}
                >
                  {checked ? <Check size={11} weight="bold" /> : null}
                  <span>{formatStageLabel(stage.slug)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* fading right-edge mask + bobbing arrow — mobile only, hides at end */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 pl-10 transition-opacity duration-200 md:hidden",
            scrollState.overflow && !scrollState.atEnd
              ? "opacity-100"
              : "opacity-0",
          )}
          style={{
            background:
              "linear-gradient(to left, var(--color-canvas) 30%, transparent)",
          }}
        >
          <span className="bob-right inline-flex h-6 w-6 items-center justify-center text-[var(--color-coral)]">
            <CaretRight size={14} weight="bold" />
          </span>
        </div>
      </div>

      {/* scroll progress bar — mobile only, hidden when no overflow */}
      <div
        aria-hidden
        className={cn(
          "mx-6 mt-3 h-[3px] overflow-hidden bg-[var(--color-line-strong)]/40 transition-opacity duration-200 md:hidden",
          scrollState.overflow ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          className="relative h-full bg-[var(--color-coral)] transition-[left,width] duration-100 ease-out"
          style={{
            width: `${scrollState.thumbWidth}%`,
            marginLeft: `${scrollState.thumbLeft}%`,
          }}
        />
      </div>
    </div>
  );
}
