"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FunnelSimple, X } from "@phosphor-icons/react";
import { buildHref, parseFilters } from "@/lib/browse/filters";
import { cn } from "@/lib/utils";

/**
 * Mobile filter drawer. Trigger button + slide-in panel covering the right
 * portion of the screen. Holds the existing FilterSidebar (passed as
 * children). Hidden above `md` — desktop uses the sticky sidebar instead.
 */
export function FilterDrawer({
  resultCount,
  totalCount,
  children,
}: {
  resultCount: number;
  totalCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = parseFilters(Object.fromEntries(search.entries()));
  const activeCount =
    state.stage.length +
    state.capability.length +
    state.pricing.length +
    state.industry.length +
    (state.q ? 1 : 0);

  // body scroll lock + esc to close
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const clearAll = () => {
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
  };

  return (
    <>
      {/* trigger — mobile only, sticky just below the sticky page header */}
      <div className="sticky top-16 z-30 -mx-6 mb-4 flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-canvas)]/95 px-6 py-3 backdrop-blur-md sm:-mx-6 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "group inline-flex h-10 items-center gap-2 border px-3 text-[12px] uppercase tracking-[0.18em] transition-colors",
            activeCount > 0
              ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]"
              : "border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink)]",
          )}
          aria-label={`Open filters${activeCount > 0 ? `, ${activeCount} active` : ""}`}
        >
          <FunnelSimple size={13} weight="regular" />
          <span>Filters</span>
          {activeCount > 0 ? (
            <span className="num inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-coral)] px-1 text-[10px] font-medium text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
        <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
          <span className="num text-[var(--color-ink)]">{resultCount}</span>{" "}
          / <span className="num">{totalCount}</span>
        </p>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/45 md:hidden"
              aria-hidden
            />
            <motion.aside
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 32 }}
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className="fixed inset-y-0 right-0 z-50 flex w-[90vw] max-w-md flex-col bg-[var(--color-canvas)] md:hidden"
            >
              {/* drawer header */}
              <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-canvas)] px-5 py-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-[20px] leading-none tracking-tight">
                    Filters
                  </h2>
                  {activeCount > 0 ? (
                    <span className="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-coral)] px-1.5 text-[10px] font-medium text-white">
                      {activeCount}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="inline-flex h-8 w-8 items-center justify-center text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
                >
                  <X size={16} weight="bold" />
                </button>
              </header>

              {/* drawer body — scrolls */}
              <div className="flex-1 overflow-y-auto px-5 py-6">
                {children}
              </div>

              {/* drawer footer — sticky CTAs */}
              <footer className="flex items-center gap-3 border-t border-[var(--color-line)] bg-[var(--color-canvas)] px-5 py-4">
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={activeCount === 0}
                  className="inline-flex h-11 items-center px-3 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] underline-offset-4 transition-colors hover:text-[var(--color-ink)] hover:underline disabled:opacity-40 disabled:hover:no-underline"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 bg-[var(--color-ink)] px-5 text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--color-canvas)] transition active:translate-y-[1px]"
                >
                  Show <span className="num">{resultCount}</span>{" "}
                  {resultCount === 1 ? "result" : "results"}
                </button>
              </footer>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
