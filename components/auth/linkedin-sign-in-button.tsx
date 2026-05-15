"use client";

// Clerk v7 split useSignIn into a new "Signal" API (custom flows, no
// authenticateWithRedirect) and the classic API under /legacy. We
// need the classic one for OAuth-redirect — Signal doesn't expose
// the strategy="oauth_*" flow.
import { useSignIn } from "@clerk/nextjs/legacy";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  LinkedinLogo,
  ArrowRight,
} from "@phosphor-icons/react";

/**
 * Custom-styled LinkedIn OAuth trigger. Replaces the placeholder
 * <Link href="/dashboard"> that lived on /login through Stage 1-3.
 *
 * Renders a button visually identical to the prior <Link> so no
 * design change. Calls signIn.authenticateWithRedirect to kick off
 * Clerk's OAuth flow with strategy="oauth_linkedin_oidc".
 *
 *   redirectUrl         → where Clerk's auth-finish handler lives
 *                         (must be a real route in this app —
 *                         /sso-callback renders the hand-off
 *                         component).
 *   redirectUrlComplete → where the user lands after the handshake
 *                         finishes successfully. Caller passes the
 *                         intent-aware destination (/dashboard or
 *                         /dashboard/onboarding/submit?as=returning).
 *
 * While the SDK hydrates (`isLoaded === false`) the button stays
 * styled but disabled so a too-early click can't be a no-op.
 */
export function LinkedInSignInButton({
  redirectUrlComplete,
  label,
}: {
  redirectUrlComplete: string;
  label: string;
}) {
  const { signIn, isLoaded } = useSignIn();
  const { isSignedIn } = useUser();
  const router = useRouter();

  const handleClick = () => {
    if (!isLoaded || !signIn) return;
    // Belt-and-braces: /login is also session-gated server-side, so
    // a signed-in user shouldn't reach this button. If they do
    // (deep link, cached page, demo-mode preview), Clerk's SDK
    // would reject the fresh sign-in flow with "You're already
    // signed in." Skip straight to where success would have landed.
    if (isSignedIn) {
      router.push(redirectUrlComplete);
      return;
    }
    void signIn.authenticateWithRedirect({
      strategy: "oauth_linkedin_oidc",
      redirectUrl: "/sso-callback",
      redirectUrlComplete,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isLoaded}
      className="group inline-flex h-12 w-full items-center justify-center gap-2.5 bg-[#0A66C2] px-5 text-[16px] text-white transition-colors hover:bg-[#0959AB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-coral)] active:translate-y-[1px] disabled:cursor-wait disabled:opacity-90 sm:h-14 sm:text-[17px]"
    >
      <LinkedinLogo size={20} weight="fill" />
      <span>{label}</span>
      <ArrowRight
        size={14}
        weight="bold"
        className="transition-transform duration-300 group-hover:translate-x-0.5"
      />
    </button>
  );
}
