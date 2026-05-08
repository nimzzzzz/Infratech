"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { useUser } from "@clerk/nextjs";

export function Header() {
  // Clerk v7 retired the <SignedIn> / <SignedOut> control
  // components from the named exports — the supported surface now
  // is the useUser() hook. While the SDK hydrates (isLoaded=false)
  // we render the signed-OUT shape: the visitor experience is the
  // larger surface, so the brief flash on a refresh-while-signed-in
  // is preferable to a brief flash of "Dashboard" for an actual
  // visitor.
  const { isLoaded, isSignedIn } = useUser();
  const showSignedIn = isLoaded && isSignedIn;
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--color-canvas)]/65">
      <div className="mx-auto flex h-auto w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-6 md:px-8 md:py-4">
        <Link
          href="/"
          aria-label="InfratechDatabase home"
          className="group flex flex-col leading-none"
        >
          <span className="font-heading text-[18px] italic leading-none tracking-tight text-[var(--color-ink)] md:text-[20px]">
            InfratechDatabase
          </span>
          <span className="mt-1.5 text-[12px] leading-snug text-[var(--color-ink-3)] md:text-[13px]">
            A repository of infrastructure technology products and companies
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {showSignedIn ? (
            // Same dimensions / styling as the bloom CTA below so the
            // header doesn't shift when auth state flips.
            <Link
              href="/dashboard"
              className="group bloom inline-flex h-9 items-center justify-center gap-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-white transition-transform active:translate-y-[1px] sm:h-10 sm:px-4 sm:text-[11px]"
            >
              <span>Dashboard</span>
              <ArrowUpRight
                size={11}
                weight="bold"
                className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
