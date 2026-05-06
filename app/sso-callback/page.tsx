"use client";

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
 */
export default function SSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}
