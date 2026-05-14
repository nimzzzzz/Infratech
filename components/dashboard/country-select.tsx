"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { countries } from "@/lib/data/countries";
import { cn } from "@/lib/utils";

export function CountrySelect({
  id,
  value,
  onChange,
  placeholder = "Pick a country…",
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? countries.filter((c) => c.name.toLowerCase().includes(q))
    : countries;

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-left text-[14px] text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
      >
        <span className={value ? "" : "text-[var(--color-ink-3)]"}>
          {value || placeholder}
        </span>
        <CaretDown
          size={12}
          weight="bold"
          className={cn(
            "text-[var(--color-ink-3)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 border border-[var(--color-line-strong)] bg-[var(--color-surface)] shadow-lg">
          <div className="border-b border-[var(--color-line)] p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="h-8 w-full border border-transparent bg-[var(--color-canvas)] px-2 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-[var(--color-ink-3)]">
                No matches.
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.name);
                      setOpen(false);
                    }}
                    className={cn(
                      "block w-full px-3 py-1.5 text-left text-[13px] text-[var(--color-ink)] hover:bg-[var(--color-canvas-warm)]",
                      c.name === value && "bg-[var(--color-canvas-warm)] font-medium",
                    )}
                  >
                    {c.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
