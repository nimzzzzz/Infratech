"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--color-canvas)]/65">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 md:h-20 md:px-8">
        <Link
          href="/"
          aria-label="InfraTechDB home"
          className="group flex items-center gap-2.5"
        >
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bloom" />
            <span className="absolute inset-0 rounded-full bloom animate-ping opacity-40" />
          </span>
          <span className="font-heading text-[18px] italic leading-none tracking-tight text-[var(--color-ink)] md:text-[20px]">
            InfraTechDB
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center border border-[var(--color-line-strong)] bg-transparent px-3 text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)] sm:h-10 sm:px-4 sm:text-[11px]"
          >
            Login
          </Link>
          <Link
            href="/login?intent=submit"
            className="group bloom inline-flex h-9 items-center justify-center gap-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-white transition-transform active:translate-y-[1px] sm:h-10 sm:px-4 sm:text-[11px]"
          >
            <span>List your product</span>
            <ArrowUpRight
              size={11}
              weight="bold"
              className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
