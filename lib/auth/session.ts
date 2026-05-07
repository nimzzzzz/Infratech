import "server-only";
import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import { vendors, type Vendor } from "@/lib/db/schema";
import { getVendorByClerkUserId } from "@/lib/queries/vendors";

export type VendorSession = {
  vendor: Vendor;
  user: {
    id: string;
    name: string;
    email: string | null;
  };
};

export type DemoOverride = "new" | "returning";

/**
 * Resolve the current vendor session.
 *
 * In demo mode (NEXT_PUBLIC_DEMO_MODE=true and not production) the
 * `demoOverride` arg short-circuits Clerk and returns a deterministic
 * seeded vendor:
 *   • "new" → first vendor with onboarded=false (typically a submitter
 *     auto-created by the seed). Used to preview the onboarding gate.
 *   • "returning" → first vendor with onboarded=true (Oracle in seed).
 *
 * Outside demo mode we require a real Clerk session. Redirects to
 * /login if unauthenticated, /login?error=… on data integrity issues.
 *
 * `requireOnboarded` defaults to TRUE — every dashboard page is
 * assumed to need a fully onboarded vendor unless it opts out. The
 * onboarding pages themselves (/dashboard/onboarding,
 * /dashboard/onboarding/submit, /dashboard/onboarding/complete) MUST
 * pass `requireOnboarded: false` or they redirect-loop.
 *
 * The strict default is deliberate: future dashboard subroutes can't
 * accidentally skip the gate by forgetting to set the option.
 */
export async function getVendorSession(opts?: {
  demoOverride?: DemoOverride;
  requireOnboarded?: boolean;
}): Promise<VendorSession> {
  const requireOnboarded = opts?.requireOnboarded ?? true;

  if (env.DEMO_MODE) {
    // In demo mode the middleware doesn't enforce Clerk auth — short-circuit
    // to a deterministic seeded vendor. ?as=new picks the first non-onboarded
    // vendor (lets us preview the onboarding gate); anything else picks the
    // first onboarded one.
    const wantOnboarded = opts?.demoOverride !== "new";
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.onboarded, wantOnboarded))
      .limit(1);
    if (!vendor) redirect("/login?error=no_demo_vendor");

    if (requireOnboarded && !vendor.onboarded) {
      redirect("/dashboard/onboarding");
    }

    return {
      vendor,
      user: {
        id: vendor.clerkUserId ?? `demo_${vendor.id}`,
        name: vendor.name,
        email: vendor.contactEmail,
      },
    };
  }

  const { userId } = await auth();
  if (!userId) redirect("/login");

  let vendor: Vendor | null = await getVendorByClerkUserId(userId);
  if (!vendor) {
    // Webhook-failure fallback. The Clerk webhook is the canonical
    // creator of vendors rows on user.created — but it's a best-effort
    // delivery (network hiccups, signing-secret rotations, dev-mode
    // tunnels, etc.). When it fails, the user has a valid Clerk
    // session but no DB row, and would otherwise dead-end at
    // /login?error=no_vendor with no recovery path. Try to repair
    // inline using Clerk's user object as the source of truth.
    vendor = await lazyCreateVendorFromClerk(userId);
  }
  if (!vendor) redirect("/login?error=no_vendor");
  if (vendor.suspended) redirect("/login?error=suspended");

  if (requireOnboarded && !vendor.onboarded) {
    redirect("/dashboard/onboarding");
  }

  return {
    vendor,
    user: {
      id: userId,
      name: vendor.name,
      email: vendor.contactEmail,
    },
  };
}

export const isDemoOverride = (v: unknown): v is DemoOverride =>
  v === "new" || v === "returning";

/**
 * Layout-friendly header data resolver.
 *
 * The dashboard layout wraps every dashboard page including onboarding,
 * but a layout can't see searchParams to know if a page is using demo
 * override. This returns sensible header props in all states:
 *
 *   • Real Clerk session → vendor row data
 *   • DEMO_MODE on, no Clerk session → first onboarded vendor (Oracle in seed)
 *   • Anything else → empty placeholder (the page render itself will
 *     redirect via getVendorSession)
 */
export async function getDashboardHeaderData(): Promise<{
  companyName: string;
  userName: string;
  userInitials: string;
  userTitle?: string | null;
}> {
  try {
    const { userId } = await auth();
    if (userId) {
      const vendor = await getVendorByClerkUserId(userId);
      if (vendor) {
        return {
          companyName: vendor.name,
          userName: vendor.name,
          userInitials: initialsOf(vendor.name),
        };
      }
    }
  } catch {
    // No middleware yet, or unauthenticated. Fall through to demo / placeholder.
  }

  if (env.DEMO_MODE) {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.onboarded, true))
      .limit(1);
    if (vendor) {
      return {
        companyName: vendor.name,
        userName: vendor.name,
        userInitials: initialsOf(vendor.name),
      };
    }
  }

  return { companyName: "—", userName: "—", userInitials: "—" };
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * Inline vendor-row creation from a Clerk user object. Used as a
 * fallback when the user.created webhook didn't run or failed —
 * keeps the (slug, clerkUserId, name, contactEmail, onboarded)
 * shape identical to what the webhook handler in
 * app/api/webhooks/clerk/route.ts produces, so a lazy-created row
 * is indistinguishable from a webhook-created one.
 *
 * onConflictDoNothing on clerk_user_id means that if a concurrent
 * webhook insert wins the race, we re-fetch and return the row it
 * created. Either way, exactly one row exists per Clerk user.
 *
 * Returns null on any failure so callers can fall through to the
 * existing /login?error=no_vendor redirect rather than throwing
 * inside getVendorSession.
 */
async function lazyCreateVendorFromClerk(
  userId: string,
): Promise<Vendor | null> {
  try {
    const cc = await clerkClient();
    const u = await cc.users.getUser(userId);

    const fullName =
      [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unnamed vendor";
    const primary = u.emailAddresses.find(
      (e) => e.id === u.primaryEmailAddressId,
    );
    const email =
      primary?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null;

    await db
      .insert(vendors)
      .values({
        slug: `${slugify(fullName)}-${userId.slice(-6)}`,
        clerkUserId: userId,
        name: fullName,
        contactEmail: email,
        onboarded: false,
      })
      .onConflictDoNothing({ target: vendors.clerkUserId });

    // Re-fetch — covers both our successful insert AND a concurrent
    // webhook insert that won the conflict.
    return await getVendorByClerkUserId(userId);
  } catch (err) {
    console.error("[session] lazyCreateVendorFromClerk failed", err);
    return null;
  }
}
