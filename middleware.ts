import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Auth + role enforcement.
 *
 *   • Public routes (/, /apps/**, /vendors/**, /stages/**, /capabilities/**,
 *     /legal/**, /sitemap.xml, /robots.txt, /api/webhooks/**, /login,
 *     /admin/login, /admin/2fa-setup) are open.
 *   • /dashboard/** requires any authenticated Clerk session. The
 *     onboarding gate (vendor.onboarded === false → /dashboard/onboarding)
 *     runs at page level via getVendorSession({ requireOnboarded: true }).
 *   • /admin/** requires publicMetadata.role === "admin" AND
 *     sessionClaims.twoFactorEnabled === true. Missing role redirects to
 *     /; missing 2FA redirects to /admin/2fa-setup so the admin can set
 *     it up before continuing.
 *
 * In DEMO_MODE (NEXT_PUBLIC_DEMO_MODE=true and not production) the
 * middleware bypasses all auth checks; pages short-circuit through their
 * session resolvers to seeded vendor/admin rows. Set DEMO_MODE=false
 * locally to test the real Clerk flow.
 */

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAdminAuthRoute = createRouteMatcher([
  "/admin/login",
  "/admin/2fa-setup",
]);

const demoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
  process.env.NODE_ENV !== "production";

export default clerkMiddleware(async (auth, req) => {
  if (demoMode) return NextResponse.next();

  // Admin first — admin routes never fall through to the vendor gate.
  if (isAdminRoute(req) && !isAdminAuthRoute(req)) {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      const url = new URL("/admin/login", req.url);
      return NextResponse.redirect(url);
    }
    const role = (
      sessionClaims?.publicMetadata as { role?: string } | undefined
    )?.role;
    if (role !== "admin") {
      const url = new URL("/", req.url);
      url.searchParams.set("error", "forbidden");
      return NextResponse.redirect(url);
    }
    const has2FA =
      (sessionClaims as { twoFactorEnabled?: boolean } | undefined)
        ?.twoFactorEnabled === true;
    if (!has2FA) {
      return NextResponse.redirect(new URL("/admin/2fa-setup", req.url));
    }
    return NextResponse.next();
  }

  if (isDashboardRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on every page except static assets and Next.js internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?)).*)",
    "/(api|trpc)(.*)",
  ],
};
