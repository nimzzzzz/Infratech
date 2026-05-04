import Link from "next/link";
import { SignOut, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { getMockSession } from "@/lib/auth/mock-session";

export function DashboardHeader() {
  const { user, company } = getMockSession();
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6 md:h-18 md:px-8">
        {/* brand */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bloom" />
            <span className="absolute inset-0 rounded-full bloom animate-ping opacity-40" />
          </span>
          <span className="font-heading text-[18px] italic leading-none tracking-tight text-[var(--color-ink)]">
            InfraTechDB
          </span>
          <span className="ml-1 text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
            / Vendor
          </span>
        </Link>

        {/* user pill + sign-out */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-canvas-warm)] text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink)] ring-1 ring-[var(--color-line-strong)]">
              {user.initials}
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] text-[var(--color-ink)]">
                {user.name}
              </span>
              <span className="text-[11px] text-[var(--color-ink-3)]">
                {company.name} &middot; {user.title}
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="group inline-flex h-9 items-center gap-1.5 border border-[var(--color-line-strong)] px-3 text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] sm:px-3.5"
          >
            <SignOut size={11} weight="regular" />
            <span className="hidden sm:inline">Sign out</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
