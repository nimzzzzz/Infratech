"use client";

import { useClerk } from "@clerk/nextjs";
import { WarningCircle } from "@phosphor-icons/react";

/**
 * Inline error banner rendered on /login when a signed-in user is
 * redirected here from a session gate (e.g. vendor_suspended). The
 * banner explains why they can't access the dashboard and offers a
 * Sign Out button so they can clear the Clerk session.
 *
 * Without this banner the redirect-from-session-gate path would
 * dead-end visually (or loop, before the /login error-aware bounce
 * skip was added).
 *
 * Recognised error codes:
 *   - "suspended"        — the vendor_member (human) is suspended
 *   - "vendor_suspended" — the vendor (company) is suspended (A.4)
 *   - "no_vendor"        — vendor_members lookup + lazy-create both
 *                          failed; signing in again triggers a fresh
 *                          webhook attempt
 *   - other / missing    — generic "something went wrong"
 */
export function LoginErrorBanner({ code }: { code: string }) {
  const clerk = useClerk();

  const onSignOut = async () => {
    try {
      await clerk.signOut({ redirectUrl: "/login" });
    } catch (err) {
      console.error("[login-error-banner] signOut failed", err);
      // Fallback — hard navigate so the page reload re-evaluates auth.
      window.location.href = "/login";
    }
  };

  const copy = errorCopy(code);

  return (
    <aside className="mb-8 flex items-start gap-3 border border-rose-300 bg-rose-50 p-4 text-rose-900">
      <WarningCircle
        size={20}
        weight="fill"
        className="mt-0.5 shrink-0 text-rose-600"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{copy.heading}</p>
        <p className="mt-1 text-[14px] leading-relaxed">{copy.body}</p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 inline-flex h-9 items-center gap-1.5 border border-rose-400 px-3 text-[13px] uppercase tracking-[0.18em] text-rose-800 transition-colors hover:bg-rose-100"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function errorCopy(code: string): { heading: string; body: string } {
  switch (code) {
    case "vendor_suspended":
      return {
        heading: "This company listing has been suspended.",
        body:
          "Your company's AllInfratech listing is currently suspended. While suspended, your team can't access the vendor dashboard and your products are hidden from the public directory. If you believe this is an error, contact team@allinfratech.com.",
      };
    case "suspended":
      return {
        heading: "This account has been suspended.",
        body:
          "Your AllInfratech account is currently suspended. If you believe this is an error, contact team@allinfratech.com.",
      };
    case "no_vendor":
      return {
        heading: "We couldn't find your vendor record.",
        body:
          "Sign in again to retry. If this persists, contact team@allinfratech.com.",
      };
    default:
      return {
        heading: "We couldn't complete that sign-in.",
        body: "Sign in again. If this persists, contact team@allinfratech.com.",
      };
  }
}
