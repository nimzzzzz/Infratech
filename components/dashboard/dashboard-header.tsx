"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { SignOut } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";

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
  /** Authenticated user's display name. */
  userName: string;
  /** LinkedIn profile picture URL (V.2). Null → UserAvatar renders
   *  the monogram fallback derived from `userName`. */
  userAvatarUrl: string | null;
  /** Optional title / subline (LinkedIn role, etc.). */
  userTitle?: string | null;
  /** Unread inquiry badge count. 0 hides the badge. */
  unreadCount: number;
};

export function DashboardHeader({
  companyName,
  userName,
  userAvatarUrl,
  userTitle,
  unreadCount,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const clerk = useClerk();
  const isOnboarding = pathname.startsWith("/dashboard/onboarding");

  const onSignOut = async () => {
    try {
      // Phase A.1.1 — clear the view_as_vendor cookie before
      // Clerk's signOut redirects away. Without this, a different
      // admin signing in on the same browser within the 4-hour
      // cookie window would inherit vendor view. Best-effort; if
      // the fetch fails the cookie still expires on its own.
      try {
        await fetch("/api/admin/exit-vendor-view", { method: "POST" });
      } catch {
        // Network blip is fine — Max-Age cleans up.
      }
      // Clears the Clerk session cookie and navigates to redirectUrl.
      // The previous implementation was a bare <Link href="/"> which
      // navigated without touching Clerk — the session cookie
      // survived, so the dashboard remained reachable and the public
      // header still rendered the signed-in shape.
      await clerk.signOut({ redirectUrl: "/" });
      // signOut handles the navigation itself, but router.refresh()
      // is belt-and-braces so the public-chrome header rerenders with
      // the signed-out shape immediately rather than after the next
      // hard reload.
      router.refresh();
    } catch (err) {
      console.error("[dashboard-header] signOut failed", err);
      // Hard fallback if Clerk's signOut rejects — get the user off
      // the dashboard one way or another.
      window.location.href = "/";
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6 md:h-18 md:px-8">
        <div className="flex items-center gap-5">
          {/* Phase A.1.1 — wordmark links to the public landing
              (matches the public-site header). The "/ Vendor"
              suffix stays as a contextual indicator but lives
              outside the link so clicking it doesn't navigate
              away from the dashboard context. */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              aria-label="AllInfratech home"
              className="group flex items-center gap-2.5"
            >
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bloom" />
                <span className="absolute inset-0 rounded-full bloom animate-ping opacity-40" />
              </span>
              <span className="font-heading text-[20px] italic leading-none tracking-tight text-[var(--color-ink)]">
                AllInfratech
              </span>
            </Link>
            <span className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
              / Vendor
            </span>
          </div>

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
                        prefetch
                        className={cn(
                          "relative inline-flex items-center gap-1.5 px-3 py-2 text-[15px] transition-colors",
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
                          <span className="num inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-coral)] px-1 text-[13px] text-white">
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
          {/* Phase A.1.1 — Browse directory link gives vendors a
              quiet way back to the public site without forcing
              them to click the small wordmark. Hidden on the
              wizard (isOnboarding) where the form is the focus,
              and on mobile (<sm) where the user pill itself is
              hidden — saves horizontal space. */}
          {!isOnboarding && (
            <Link
              href="/"
              className="group hidden items-center gap-1 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)] sm:inline-flex"
            >
              Browse directory
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          )}
          <div className="hidden items-center gap-2.5 sm:flex">
            <UserAvatar avatarUrl={userAvatarUrl} name={userName} size={32} />
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] text-[var(--color-ink)]">
                {userName}
              </span>
              <span className="text-[13px] text-[var(--color-ink-3)]">
                {companyName}
                {userTitle ? ` · ${userTitle}` : ""}
              </span>
            </div>
          </div>
          {/* Sign-out button. On /dashboard/onboarding/** the
              Overview/Messages nav is hidden, leaving the header
              sparse — the low-key 10px ink-2 border treatment that
              works on /dashboard root reads as decorative footer
              text in the wizard context. Bump the visual weight on
              isOnboarding so users mid-wizard can actually see this
              as their way out: stronger border, bigger label,
              always-visible text. Off isOnboarding keeps the
              quieter treatment so the dashboard nav has visual
              primacy. */}
          <button
            type="button"
            onClick={onSignOut}
            className={cn(
              "group inline-flex items-center gap-1.5 border transition-colors active:translate-y-[1px]",
              isOnboarding
                ? "h-10 border-[var(--color-ink)] px-4 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]"
                : "h-9 border-[var(--color-line-strong)] px-3 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] sm:px-3.5",
            )}
          >
            <SignOut size={isOnboarding ? 13 : 11} weight="regular" />
            <span className={isOnboarding ? "inline" : "hidden sm:inline"}>
              Sign out
            </span>
          </button>
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
                    prefetch
                    className={cn(
                      "relative inline-flex items-center gap-1.5 px-3 py-3 text-[14px] transition-colors",
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
                      <span className="num inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-coral)] px-1 text-[13px] text-white">
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
