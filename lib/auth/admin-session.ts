import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import { vendorMembers, type VendorMember } from "@/lib/db/schema";
import { isAdminEmail } from "@/lib/auth/admin-allowlist";

/**
 * Request-scoped cache of `vendor_members WHERE clerk_user_id = ?`.
 * Both `getAdminSession` (page-side, redirects on auth fail) and
 * `getAdminHeaderData` (layout-side, returns placeholders on miss)
 * resolve through here. Before this dedupe, every /admin/** render
 * fired the same SELECT twice — once for the layout's header pill,
 * once for the page's auth gate.
 *
 * Returns the raw row (or null). Callers do their own isAdmin /
 * suspended / redirect logic on the result.
 */
const getMemberByClerkId = cache(
  async (clerkUserId: string): Promise<VendorMember | null> => {
    const [row] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.clerkUserId, clerkUserId))
      .limit(1);
    return row ?? null;
  },
);

/**
 * Phase A.1: admins are vendor_members rows with is_admin=true.
 * The legacy `admins` table is dormant — no readers in this file.
 *
 * AdminSession returns the matching vendor_members row directly; the
 * old Admin shape (separate table, email field non-null) is preserved
 * via a thin adapter on the user object.
 */
export type AdminSession = {
  admin: VendorMember;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

/**
 * Resolve the current admin session.
 *
 * In demo mode (NEXT_PUBLIC_DEMO_MODE=true and not production) we
 * return the first vendor_members row with is_admin=true so the
 * admin UI is browsable without going through Clerk. Outside demo
 * mode we require a real Clerk session whose vendor_members row has
 * is_admin=true; the middleware additionally enforces 2FA on
 * /admin/** routes.
 *
 * Lazy-create mirrors the vendor session pattern: if the Clerk
 * session exists but no vendor_members row does (webhook missed
 * delivery, signing-secret rotation, etc.), insert a row inline
 * with is_admin computed from the same email allowlist. Same
 * security boundary: only the *verified* primary email is checked.
 */
export async function getAdminSession(): Promise<AdminSession> {
  if (env.DEMO_MODE) {
    const [member] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.isAdmin, true))
      .limit(1);
    if (member) {
      return {
        admin: member,
        user: {
          id: member.clerkUserId,
          name: member.name,
          email: member.primaryEmail,
        },
      };
    }
  }

  const { userId } = await auth();
  if (!userId) redirect("/admin/login");

  let member = await getMemberByClerkId(userId);

  if (!member) {
    member = await lazyCreateAdminMember(userId);
  }

  if (!member) redirect("/admin/login?error=no_admin");
  if (!member.isAdmin) redirect("/?error=forbidden");
  if (member.suspended) redirect("/admin/login?error=suspended");

  return {
    admin: member,
    user: {
      id: userId,
      name: member.name,
      email: member.primaryEmail,
    },
  };
}

export async function getAdminHeaderData(): Promise<{
  name: string;
  email: string;
  avatarUrl: string | null;
}> {
  try {
    const { userId } = await auth();
    if (userId) {
      // Shares the cached `vendor_members` row with getAdminSession()
      // — single DB hit per request even when both fire on the same
      // /admin/** render. Filter is_admin in JS rather than the query
      // so the cache key (just userId) stays consistent.
      const member = await getMemberByClerkId(userId);
      if (member && member.isAdmin) {
        return {
          name: member.name,
          email: member.primaryEmail,
          avatarUrl: member.avatarUrl,
        };
      }
    }
  } catch {
    // Middleware not wired yet, or unauthenticated. Fall through.
  }

  if (env.DEMO_MODE) {
    const [member] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.isAdmin, true))
      .limit(1);
    if (member) {
      return {
        name: member.name,
        email: member.primaryEmail,
        avatarUrl: member.avatarUrl,
      };
    }
  }

  return { name: "—", email: "—", avatarUrl: null };
}

/**
 * Webhook-failure fallback for admins. Same shape as the
 * lazyCreateVendorMemberFromClerk path in lib/auth/session.ts, with
 * is_admin computed from the verified primary email vs the
 * CLERK_ADMIN_EMAILS allowlist. ON CONFLICT DO NOTHING so a
 * concurrent webhook insert can't deadlock.
 */
async function lazyCreateAdminMember(
  userId: string,
): Promise<VendorMember | null> {
  try {
    const cc = await clerkClient();
    const u = await cc.users.getUser(userId);
    const name =
      [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unnamed";
    const primary = u.emailAddresses.find(
      (e) => e.id === u.primaryEmailAddressId,
    );
    const primaryEmail =
      primary?.emailAddress ??
      u.emailAddresses[0]?.emailAddress ??
      `${userId}@unknown.example`;
    const verifiedEmail =
      primary?.verification?.status === "verified"
        ? primary.emailAddress
        : null;
    const isAdmin = isAdminEmail(verifiedEmail);

    await db
      .insert(vendorMembers)
      .values({
        vendorId: null,
        clerkUserId: userId,
        name,
        primaryEmail,
        avatarUrl: u.imageUrl ?? null,
        onboarded: false,
        isAdmin,
      })
      .onConflictDoNothing({ target: vendorMembers.clerkUserId });

    const [row] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.clerkUserId, userId))
      .limit(1);
    return row ?? null;
  } catch (err) {
    console.error("[admin-session] lazyCreateAdminMember failed", err);
    return null;
  }
}
