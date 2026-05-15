"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { buildHref, parseFilters, type FilterState } from "@/lib/browse/filters";
import styles from "./search-bar.module.css";

const DEBOUNCE_MS = 350;

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const state = parseFilters(Object.fromEntries(search.entries()));
  const [value, setValue] = useState(state.q);

  // Echo guard — what we last asked the URL to become. When `state.q`
  // matches this, the URL change is just our own debounced push echoing
  // back; ignore it so we don't overwrite in-flight typing. Reset to
  // null when the URL changes from any other source (clear-all chip,
  // browser back, deep link) so the next external change wins.
  const lastPushedRef = useRef<string | null>(null);

  // Refs for the debounced effect so it never closes over stale state.
  // Updated on every render; read inside the timeout callback.
  const stateRef = useRef<FilterState>(state);
  const pathnameRef = useRef<string>(pathname);
  stateRef.current = state;
  pathnameRef.current = pathname;

  // Composition guard — IME / autocorrect users emit onChange for each
  // half-composed character. Suppress the URL push until composition ends.
  const composingRef = useRef(false);

  const [, startTransition] = useTransition();

  // Sync URL → local ONLY when the change wasn't initiated by us.
  useEffect(() => {
    if (state.q === lastPushedRef.current) {
      // This is the echo of our own router.push. Ignore — local state
      // is the source of truth right now.
      lastPushedRef.current = null;
      return;
    }
    if (state.q !== value) {
      setValue(state.q);
    }
    // We deliberately depend on state.q only — `value` in deps would
    // cause the effect to fire on every keystroke and fight typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.q]);

  // Debounced URL push. Skipped while composing.
  useEffect(() => {
    if (composingRef.current) return;
    if (value === state.q) return;
    const t = setTimeout(() => {
      lastPushedRef.current = value;
      startTransition(() => {
        router.push(
          buildHref(pathnameRef.current, stateRef.current, { q: value }),
          { scroll: false },
        );
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // Only re-fire when local value changes; refs handle pathname/state.
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
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          // Composition ended — sync local with the final composed value
          // so the debounced push picks it up on the next render.
          setValue(e.currentTarget.value);
        }}
        placeholder="Search by name, capability, or vendor…"
        className={`${styles.input} h-full w-full bg-transparent px-3 text-[18px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)]`}
        aria-label="Search the directory"
      />
    </label>
  );
}
