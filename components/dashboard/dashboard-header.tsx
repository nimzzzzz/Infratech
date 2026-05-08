"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const nav = [
  {
    href: "/dashboard",
    label: "Overview",
    match: (p: string) => p === "/dashboard",
  },
  {
    href: "/dashboard/messages",
    label: "Messages",
    match: (p: string) => p.startsWith("/dashboard/messages"),
  },
];

export type DashboardHeaderProps = {
  /** Vendor row name; what the header shows in the user pill. */
  companyName: string;
  /** Authenticated user's display name + initials. */
  userName: string;
  userInitials: string;
  /** Optional title / subline (LinkedIn role, etc.). */
  userTitle?: string | null;
  /** Unread inquiry badge count. 0 hides the badge. */
  unreadCount: number;
};

export function DashboardHeader({
  companyName,
  userName,
  userInitials,
  userTitle,
  unreadCount,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/dashboard/onboarding");

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6 md:h-18 md:px-8">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="group flex items-center gap-2.5">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bloom" />
              <span className="absolute inset-0 rounded-full bloom animate-ping opacity-40" />
            </span>
            <span className="font-heading text-[18px] italic leading-none tracking-tight text-[var(--color-ink)]">
              AllInfratech
            </span>
            <span className="ml-1 text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
              / Vendor
            </span>
          </Link>

          {!isOnboarding && (
            <nav aria-label="Dashboard sections" className="hidden md:block">
              <ul className="ml-2 flex items-center">
                {nav.map((item) => {
                  const active = item.match(pathname);
                  const showBadge =
                    item.href === "/dashboard/messages" && unreadCount > 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors",
                          active
                            ? "text-[var(--color-ink)]"
                            : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
                        )}
                      >
                        <span className="relative">
                          {item.label}
                          {active ? (
                            <span
                              aria-hidden
                              className="absolute -bottom-1.5 left-0 right-0 h-px bloom"
                            />
                          ) : null}
                        </span>
                        {showBadge ? (
                          <span className="num inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-coral)] px-1 text-[10px] font-medium text-white">
                            {unreadCount}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-canvas-warm)] text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink)] ring-1 ring-[var(--color-line-strong)]">
              {userInitials}
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] text-[var(--color-ink)]">
                {userName}
              </span>
              <span className="text-[11px] text-[var(--color-ink-3)]">
                {companyName}
                {userTitle ? ` · ${userTitle}` : ""}
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

      {!isOnboarding && (
        <nav
          aria-label="Dashboard sections"
          className="border-t border-[var(--color-line)] bg-[var(--color-canvas)]/85 md:hidden"
        >
          <ul className="mx-auto flex w-full max-w-6xl items-center gap-0 px-5 sm:px-6">
            {nav.map((item) => {
              const active = item.match(pathname);
              const showBadge =
                item.href === "/dashboard/messages" && unreadCount > 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative inline-flex items-center gap-1.5 px-3 py-3 text-[12px] font-medium transition-colors",
                      active
                        ? "text-[var(--color-ink)]"
                        : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
                    )}
                  >
                    <span className="relative">
                      {item.label}
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute -bottom-2 left-0 right-0 h-px bloom"
                        />
                      ) : null}
                    </span>
                    {showBadge ? (
                      <span className="num inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-coral)] px-1 text-[10px] font-medium text-white">
                        {unreadCount}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
