/**
 * Pure decision function for middleware routing. Extracted so it can be
 * unit-tested without spinning up the Clerk runtime — middleware.ts is
 * now a thin shell that wires Clerk's auth() and the DB lookup into this
 * function.
 *
 * The contract:
 *   • DEMO_MODE → always "next"
 *   • /admin/** (except /admin/login, /admin/2fa-setup):
 *       – no userId → redirect to /admin/login
 *       – role !== "admin" (after DB fallback) → redirect to /?error=forbidden
 *       – !has2FA → redirect to /admin/2fa-setup
 *       – otherwise → next
 *   • /dashboard/** :
 *       – no userId → redirect to /login
 *       – otherwise → next
 *   • everything else → next
 *
 * Role resolution: prefer the JWT claim. If the claim is missing
 * entirely (publicMetadata.role undefined — typically the brief window
 * between the webhook DB insert and Clerk metadata propagation), fall
 * back to the DB lookup. If the claim is present but isn't "admin",
 * trust it (don't escalate via DB).
 */

export type ClaimedRole = "admin" | "vendor" | undefined;

export type Decision =
  | { kind: "next" }
  | { kind: "redirect"; to: string };

export type DecideRouteInput = {
  pathname: string;
  userId: string | null;
  role: ClaimedRole;
  has2FA: boolean;
  /** Called only if `role` is undefined and the path needs admin auth. */
  isAdminInDb: () => Promise<boolean>;
  demoMode: boolean;
};

export async function decideRoute(opts: DecideRouteInput): Promise<Decision> {
  if (opts.demoMode) return { kind: "next" };

  const isAdminAuthRoute =
    opts.pathname === "/admin/login" ||
    opts.pathname === "/admin/2fa-setup";
  const isAdminRoute = opts.pathname.startsWith("/admin");
  const isDashboardRoute = opts.pathname.startsWith("/dashboard");

  if (isAdminRoute && !isAdminAuthRoute) {
    if (!opts.userId) {
      return { kind: "redirect", to: "/admin/login" };
    }

    let isAdmin = opts.role === "admin";
    if (!isAdmin && opts.role === undefined) {
      isAdmin = await opts.isAdminInDb();
    }

    if (!isAdmin) {
      return { kind: "redirect", to: "/?error=forbidden" };
    }
    if (!opts.has2FA) {
      return { kind: "redirect", to: "/admin/2fa-setup" };
    }
    return { kind: "next" };
  }

  if (isDashboardRoute) {
    if (!opts.userId) {
      return { kind: "redirect", to: "/login" };
    }
  }

  return { kind: "next" };
}
