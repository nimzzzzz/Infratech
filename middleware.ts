import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";

/**
 * Auth + role enforcement.
 *
 *   • Public routes (/, /apps/**, /vendors/**, /stages/**, /capabilities/**,
 *     /legal/**, /sitemap.xml, /robots.txt, /api/webhooks/**, /login,
 *     /admin/login, /admin/2fa-setup) are open.
 *   • /dashboard/** requires any authenticated Clerk session. The
 *     onboarding gate (vendor.onboarded === false → /dashboard/onboarding)
 *     runs at page level via getVendorSession({ requireOnboarded: true }).
 *   • /admin/** requires role === "admin" AND
 *     sessionClaims.twoFactorEnabled === true. Role is checked first
 *     against publicMetadata.role; if missing (e.g. metadata sync failed
 *     after first sign-in), we fall back to a DB lookup against the
 *     admins table — DB is the source of truth. Missing role → "/";
 *     missing 2FA → /admin/2fa-setup.
 *
 * Runs in Node runtime so we can use postgres.js for the DB fallback.
 *
 * In DEMO_MODE (NEXT_PUBLIC_DEMO_MODE=true and not production) the
 * middleware bypasses all auth checks; pages short-circuit through
 * their session resolvers to seeded data.
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

async function isAdminInDb(clerkUserId: string): Promise<boolean> {
  try {
    const [row] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.clerkUserId, clerkUserId))
      .limit(1);
    return !!row;
  } catch (err) {
    console.error("[middleware] DB fallback lookup failed", err);
    return false;
  }
}

export default clerkMiddleware(async (auth, req) => {
  if (demoMode) return NextResponse.next();

  if (isAdminRoute(req) && !isAdminAuthRoute(req)) {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    const claimedRole = (
      sessionClaims?.publicMetadata as { role?: string } | undefined
    )?.role;

    let isAdmin = claimedRole === "admin";
    // Source-of-truth fallback when the JWT claim is missing — happens
    // briefly between webhook DB insert and Clerk metadata propagation.
    if (!isAdmin && !claimedRole) {
      isAdmin = await isAdminInDb(userId);
    }

    if (!isAdmin) {
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
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?)).*)",
    "/(api|trpc)(.*)",
  ],
};
