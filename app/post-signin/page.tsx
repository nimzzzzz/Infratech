import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { vendorMembers } from "@/lib/db/schema";
import { isAdminEmail } from "@/lib/auth/admin-allowlist";

export const metadata: Metadata = {
  title: "Signing in…",
  robots: { index: false, follow: false },
};

/**
 * Canonical post-OAuth landing surface.
 *
 * LinkedInSignInButton routes Clerk's `redirectUrlComplete` here.
 * This page reads the vendor_members row (lazy-creating if the
 * webhook hasn't delivered yet) and branches:
 *
 *   - is_admin=true → /admin
 *   - ?intent=submit → /dashboard/onboarding/submit?as=returning
 *   - else → /dashboard
 *
 * Pure server component, no UI — always redirects. The page can
 * never render content because every code path ends in `redirect()`.
 *
 * Why a dedicated page and not just /dashboard:
 *   • Admins shouldn't load /dashboard at all (wastes a render,
 *     flashes wrong UI, queries vendor data they don't need).
 *   • Centralising the post-auth branching keeps middleware free
 *     of DB queries on every page load.
 *   • Middleware still has admin↔dashboard cross-redirects as
 *     defence-in-depth for bookmarked / deep-linked URLs.
 */
export default async function PostSigninPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const sp = await searchParams;
  const intent = Array.isArray(sp.intent) ? sp.intent[0] : sp.intent;

  // Look up the member row. Lazy-create if missing — same webhook-
  // failure-fallback pattern as lib/auth/session.ts. Promotes via
  // the email allowlist on inline insert, matching the webhook's
  // user.created semantics so a missed webhook can't trap an admin
  // on the vendor side.
  let [member] = await db
    .select()
    .from(vendorMembers)
    .where(eq(vendorMembers.clerkUserId, userId))
    .limit(1);

  if (!member) {
    try {
      const cc = await clerkClient();
      const u = await cc.users.getUser(userId);
      const name =
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        "Unnamed vendor";
      const primary = u.emailAddresses.find(
        (e) => e.id === u.primaryEmailAddressId,
      );
      const primaryEmail =
        primary?.emailAddress ??
        u.emailAddresses[0]?.emailAddress ??
        `${userId}@unknown.example`;
      // Only the verified primary email is checked against the
      // allowlist — same security boundary as the webhook.
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
          onboarded: false,
          isAdmin,
        })
        .onConflictDoNothing({ target: vendorMembers.clerkUserId });

      // Refetch — either our insert won, or a concurrent webhook
      // insert won the conflict.
      [member] = await db
        .select()
        .from(vendorMembers)
        .where(eq(vendorMembers.clerkUserId, userId))
        .limit(1);
    } catch (err) {
      console.error("[post-signin] lazy-create failed", err);
    }
  }

  if (!member) {
    // Lazy-create failed and the webhook hasn't landed. Send the
    // user back to /login with a hint; signing in again triggers
    // another webhook attempt.
    redirect("/login?error=no_vendor");
  }

  if (member.suspended) {
    redirect("/login?error=suspended");
  }

  if (member.isAdmin) {
    redirect("/admin");
  }

  if (intent === "submit") {
    redirect("/dashboard/onboarding/submit?as=returning");
  }

  redirect("/dashboard");
}
