import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { vendorMembers } from "@/lib/db/schema";
import { decideRoute } from "@/lib/auth/middleware-decision";

/**
 * Auth + role enforcement.
 *
 * The decision logic lives in lib/auth/middleware-decision.ts as a
 * pure function so it's unit-testable without the Clerk runtime.
 * This file is the thin shell that adapts clerkMiddleware to that
 * function.
 *
 * Runtime: nodejs (so postgres.js works for the DB fallback).
 *
 * In DEMO_MODE the middleware short-circuits — pages handle their own
 * fallbacks via getVendorSession / getAdminSession against seeded
 * data.
 *
 * is_admin lookup (Phase A.1): the legacy admins table is dormant.
 * The DB fallback queries vendor_members.is_admin keyed on
 * clerk_user_id. Hot-path requests with a populated JWT claim skip
 * this query entirely.
 */

const demoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
  process.env.NODE_ENV !== "production";

async function isAdminInDb(clerkUserId: string): Promise<boolean> {
  try {
    const [row] = await db
      .select({ isAdmin: vendorMembers.isAdmin })
      .from(vendorMembers)
      .where(eq(vendorMembers.clerkUserId, clerkUserId))
      .limit(1);
    return row?.isAdmin === true;
  } catch (err) {
    console.error("[middleware] DB fallback lookup failed", err);
    return false;
  }
}

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const meta = sessionClaims?.publicMetadata as
    | { is_admin?: boolean }
    | undefined;
  const isAdminClaim = typeof meta?.is_admin === "boolean" ? meta.is_admin : undefined;
  const has2FA =
    (sessionClaims as { twoFactorEnabled?: boolean } | undefined)
      ?.twoFactorEnabled === true;
  // Phase A.1.1 — admin's "View as vendor" toggle.
  const viewAsVendor = req.cookies.get("view_as_vendor")?.value === "true";

  const decision = await decideRoute({
    pathname: req.nextUrl.pathname,
    userId: userId ?? null,
    isAdminClaim,
    has2FA,
    isAdminInDb: () => (userId ? isAdminInDb(userId) : Promise.resolve(false)),
    viewAsVendor,
    demoMode,
  });

  if (decision.kind === "redirect") {
    return NextResponse.redirect(new URL(decision.to, req.url));
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
