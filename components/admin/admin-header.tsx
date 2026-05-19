"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { SignOut, ShieldCheck, Eye } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { enterVendorView } from "@/lib/admin/view-as-vendor";
import { UserAvatar } from "@/components/shared/user-avatar";

export type AdminHeaderProps = {
  name: string;
  email: string;
  avatarUrl: string | null;
};

// Phase A.1 nav placeholders. Submissions / Vendors / Inquiries /
// Analytics / Settings land in later sub-phases of Stage 5; until
// then their hrefs go to /admin (Overview) so a click doesn't
// 404. Each carries `placeholder: true` for a subtle visual cue.
const nav = [
  { href: "/admin", label: "Overview", placeholder: false, match: (p: string) => p === "/admin" },
  {
    href: "/admin/submissions",
    label: "Submissions",
    placeholder: false,
    match: (p: string) =>
      p.startsWith("/admin/submissions") || p.startsWith("/admin/queue"),
  },
  {
    href: "/admin/directory",
    label: "Directory",
    placeholder: false,
    match: (p: string) => p.startsWith("/admin/directory"),
  },
  {
    href: "/admin/inquiries",
    label: "Inquiries",
    placeholder: false,
    match: (p: string) => p.startsWith("/admin/inquiries"),
  },
  { href: "/admin", label: "Analytics", placeholder: true, match: () => false },
  { href: "/admin", label: "Settings", placeholder: true, match: () => false },
];

export function AdminHeader({
  name,
  email,
  avatarUrl,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const clerk = useClerk();

  const onSignOut = async () => {
    try {
      // Phase A.1.1 — clear view_as_vendor cookie in case it was
      // set (admin currently in vendor view shouldn't see this
      // header, but signing out from either header should leave
      // no stale impersonation cookie behind for the next user
      // on the same browser).
      try {
        await fetch("/api/admin/exit-vendor-view", { method: "POST" });
      } catch {
        // Network blip is fine — Max-Age cleans up.
      }
      await clerk.signOut({ redirectUrl: "/" });
      router.refresh();
    } catch (err) {
      console.error("[admin-header] signOut failed", err);
      window.location.href = "/";
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 md:h-18 md:px-8">
        {/* brand + admin badge */}
        <div className="flex items-center gap-4">
          <Link href="/admin" prefetch className="group flex items-center gap-2.5">
            <span className="font-heading text-[20px] italic leading-none tracking-tight text-[var(--color-ink)]">
              allinfratech
            </span>
            <span className="ml-1 inline-flex items-center gap-1 border border-[var(--color-magenta)]/40 bg-[var(--color-canvas-warm)] px-1.5 py-0.5 text-[13px] uppercase tracking-[0.22em] text-[var(--color-magenta)]">
              <ShieldCheck size={10} weight="fill" />
              Admin
            </span>
          </Link>

          {/* nav */}
          <nav aria-label="Admin sections" className="hidden md:block">
            <ul className="ml-3 flex items-center">
              {nav.map((item, idx) => {
                const active = item.match(pathname);
                return (
                  <li key={`${item.label}-${idx}`}>
                    <Link
                      href={item.href}
                      prefetch={!item.placeholder}
                      title={item.placeholder ? "Coming soon" : undefined}
                      aria-disabled={item.placeholder || undefined}
                      className={cn(
                        "relative inline-flex items-center px-3 py-2 text-[15px] transition-colors",
                        active
                          ? "text-[var(--color-ink)]"
                          : item.placeholder
                            ? "cursor-default text-[var(--color-ink-3)]/70"
                            : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
                      )}
                      onClick={
                        item.placeholder ? (e) => e.preventDefault() : undefined
                      }
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* user pill + sign-out */}
        <div className="flex items-center gap-3">
          <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
            <UserAvatar avatarUrl={avatarUrl} name={name} size={32} />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] text-[var(--color-ink)]">
                {name}
              </span>
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-[var(--color-ink-3)]">
                {email}
              </span>
            </div>
          </div>
          {/* Phase A.1.1 — View-as-vendor toggle. Form-action wires
              the server action without client JS state. Sits visually
              below Sign Out in hierarchy (same border treatment, no
              fill) but ahead of it in the row so the higher-impact
              Sign Out is the rightmost element (matches public-site
              button ordering convention). */}
          <form action={enterVendorView} className="ml-auto shrink-0">
            <button
              type="submit"
              className="group inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap border border-[var(--color-line-strong)] bg-transparent px-3 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)] active:translate-y-[1px] sm:h-10 sm:px-4 sm:text-[13px]"
              title="Open /dashboard as if you were a vendor (for QA)"
            >
              <Eye size={13} weight="regular" />
              <span className="hidden sm:inline">View as vendor</span>
            </button>
          </form>
          <button
            type="button"
            onClick={onSignOut}
            className="shrink-0 group inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap border border-[var(--color-line-strong)] bg-transparent px-3 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)] active:translate-y-[1px] sm:h-10 sm:px-4 sm:text-[13px]"
          >
            <SignOut size={13} weight="regular" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* mobile nav */}
      <nav
        aria-label="Admin sections"
        className="border-t border-[var(--color-line)] bg-[var(--color-canvas)]/85 md:hidden"
      >
        <ul className="mx-auto flex w-full max-w-7xl items-center gap-0 overflow-x-auto px-5 sm:px-6">
          {nav.map((item, idx) => {
            const active = item.match(pathname);
            return (
              <li key={`${item.label}-${idx}`}>
                <Link
                  href={item.href}
                  prefetch={!item.placeholder}
                  title={item.placeholder ? "Coming soon" : undefined}
                  aria-disabled={item.placeholder || undefined}
                  className={cn(
                    "relative inline-flex items-center px-3 py-3 text-[14px] transition-colors",
                    active
                      ? "text-[var(--color-ink)]"
                      : item.placeholder
                        ? "cursor-default text-[var(--color-ink-3)]/70"
                        : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
                  )}
                  onClick={
                    item.placeholder ? (e) => e.preventDefault() : undefined
                  }
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
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
