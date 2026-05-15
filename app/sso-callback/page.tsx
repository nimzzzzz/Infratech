"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * Required hand-off for Clerk's redirect-based OAuth flow.
 *
 * The flow:
 *   /login           → user clicks LinkedIn button
 *   Clerk hosted     → forwards to LinkedIn
 *   LinkedIn         → returns to https://<domain>/sso-callback?<oauth params>
 *   /sso-callback    → renders <AuthenticateWithRedirectCallback /> which
 *                      reads the oauth params, finalises the session, then
 *                      redirects to the redirectUrlComplete originally
 *                      passed to authenticateWithRedirect()
 *
 * If the user lands here without valid oauth params (direct nav, refresh,
 * etc.) Clerk's component bounces them to the configured sign-in URL.
 *
 * Visual shell: full-viewport centered loading state so users never see
 * the previous broken-looking layout (where the public footer would float
 * mid-page over an empty body during the 1–3 s OAuth exchange, longer
 * on cold-start). The MainChrome wrapper excludes /sso-callback so this
 * page owns the viewport.
 *
 * <AuthenticateWithRedirectCallback /> renders nothing itself — it's a
 * useEffect that runs the code exchange + redirect. We mount it as a
 * sibling to the loading UI; once the redirect fires the user is on
 * /post-signin and this page is unmounted.
 */
export default function SSOCallbackPage() {
  // After 8 s the helper line swaps to a "still working / try again"
  // fallback so the user isn't left staring at a stuck spinner if
  // Clerk's redirect silently fails. Past 5 s most users already
  // suspect a broken page; 8 s gives slow connections + cold Vercel
  // functions some headroom before we second-guess the in-flight
  // OAuth exchange.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--color-canvas)] px-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <span
          aria-hidden
          className="block h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-coral)]"
        />
        <h1 className="font-heading text-[24px] leading-tight tracking-tight text-[var(--color-ink)] md:text-[26px]">
          Completing sign-in&hellip;
        </h1>
        {slow ? (
          <p className="max-w-[42ch] text-[15px] leading-relaxed text-[var(--color-ink-3)]">
            Taking longer than expected.{" "}
            <Link
              href="/login"
              prefetch
              className="underline underline-offset-4 hover:text-[var(--color-ink)]"
            >
              Try signing in again.
            </Link>
          </p>
        ) : (
          <p className="max-w-[42ch] text-[15px] leading-relaxed text-[var(--color-ink-3)]">
            Just a moment while we finish handing you off.
          </p>
        )}
      </div>
      <AuthenticateWithRedirectCallback />
    </main>
  );
}
