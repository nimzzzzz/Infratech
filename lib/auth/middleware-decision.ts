/**
 * Pure decision function for middleware routing. Extracted so it can be
 * unit-tested without spinning up the Clerk runtime — middleware.ts is
 * now a thin shell that wires Clerk's auth() and the DB lookup into this
 * function.
 *
 * Contract (Phase A.1, single-human-table model):
 *
 *   • DEMO_MODE → always "next"
 *
 *   • /admin/login, /admin/2fa-setup → next
 *     (exempt routes admins use *before* they have a session)
 *
 *   • /admin/** :
 *       – no userId → redirect to /admin/login
 *       – isAdmin (claim then DB fallback) — !isAdmin → redirect to /dashboard
 *         (NOT /?error=forbidden — keeping non-admins inside the
 *         authenticated area is friendlier than dumping to the public
 *         site; the dashboard layout then handles them)
 *       – !has2FA → redirect to /admin/2fa-setup
 *         (DISABLED by default until /admin/2fa-setup ships in
 *          Phase A.1.2 — see BACKLOG. Re-enable by setting
 *          ENFORCE_ADMIN_2FA=true on Vercel; no code change needed.)
 *       – otherwise → next
 *
 *   • /dashboard/** :
 *       – no userId → redirect to /login
 *       – isAdmin AND !viewAsVendor (claim then DB fallback) →
 *         redirect to /admin (admins should never see the vendor
 *         UI; covers bookmarked /dashboard URLs and stale tabs)
 *       – isAdmin AND viewAsVendor → next (admin has opted into
 *         vendor view via the toggle in the admin header; cookie
 *         loosens the redirect rule for QA purposes — Phase
 *         A.1.1)
 *       – otherwise → next
 *
 *   • /post-signin :
 *       – no userId → redirect to /login
 *       – otherwise → next (the page itself does the is_admin
 *         branching; middleware just gates auth)
 *
 *   • everything else → next
 *
 * is_admin resolution: prefer the JWT claim
 * (publicMetadata.is_admin === true), set by the webhook's best-
 * effort syncAdminFlagToClerk. If the claim is missing entirely
 * (typically the window between webhook DB insert and Clerk metadata
 * propagation, or a manual UPDATE that hasn't triggered a JWT
 * refresh), fall back to the DB lookup. If the claim is present and
 * false, trust it — don't escalate via DB on every request.
 */

export type Decision =
  | { kind: "next" }
  | { kind: "redirect"; to: string };

export type DecideRouteInput = {
  pathname: string;
  userId: string | null;
  /** publicMetadata.is_admin from the JWT, if present. */
  isAdminClaim: boolean | undefined;
  has2FA: boolean;
  /** Called only when `isAdminClaim` is undefined and the path
   *  needs the answer (admin or dashboard route). */
  isAdminInDb: () => Promise<boolean>;
  /** Phase A.1.1 — the `view_as_vendor=true` cookie set by the
   *  admin's "View as vendor" button. When true AND the actor is
   *  an admin, /dashboard/** requests pass through instead of
   *  redirecting to /admin. Cookie alone doesn't grant access —
   *  is_admin is still required. */
  viewAsVendor: boolean;
  demoMode: boolean;
};

export async function decideRoute(opts: DecideRouteInput): Promise<Decision> {
  if (opts.demoMode) return { kind: "next" };

  const isAdminAuthRoute =
    opts.pathname === "/admin/login" ||
    opts.pathname === "/admin/2fa-setup";
  const isAdminRoute = opts.pathname.startsWith("/admin");
  const isDashboardRoute = opts.pathname.startsWith("/dashboard");
  const isPostSignin = opts.pathname === "/post-signin";

  if (isAdminRoute && !isAdminAuthRoute) {
    if (!opts.userId) {
      return { kind: "redirect", to: "/admin/login" };
    }

    let isAdmin = opts.isAdminClaim === true;
    if (!isAdmin && opts.isAdminClaim === undefined) {
      isAdmin = await opts.isAdminInDb();
    }

    if (!isAdmin) {
      // Friendlier than /?error=forbidden — non-admin signed-in
      // users land on their own dashboard rather than the public
      // homepage with an error param.
      return { kind: "redirect", to: "/dashboard" };
    }
    // TODO(A.1.2): re-enable 2FA enforcement when /admin/2fa-setup
    // page is built. Tracked in BACKLOG.md. Wrapped in an env flag
    // so production can flip it back on with a single Vercel env
    // toggle once the page lands — no code change required.
    if (process.env.ENFORCE_ADMIN_2FA === "true" && !opts.has2FA) {
      return { kind: "redirect", to: "/admin/2fa-setup" };
    }
    return { kind: "next" };
  }

  if (isDashboardRoute) {
    if (!opts.userId) {
      return { kind: "redirect", to: "/login" };
    }
    // Admin visiting /dashboard → bounce to /admin. Covers the
    // case where an admin pastes a /dashboard URL, follows a
    // stale link, or has a refreshed session.
    let isAdmin = opts.isAdminClaim === true;
    if (!isAdmin && opts.isAdminClaim === undefined) {
      isAdmin = await opts.isAdminInDb();
    }
    if (isAdmin) {
      // Phase A.1.1: the view_as_vendor cookie loosens the
      // admin→/admin redirect rule so admins can QA the vendor
      // flow. The cookie alone doesn't grant access (is_admin is
      // still required) — it just gates this specific redirect.
      if (opts.viewAsVendor) {
        return { kind: "next" };
      }
      return { kind: "redirect", to: "/admin" };
    }
    return { kind: "next" };
  }

  if (isPostSignin) {
    if (!opts.userId) {
      return { kind: "redirect", to: "/login" };
    }
    return { kind: "next" };
  }

  return { kind: "next" };
}
