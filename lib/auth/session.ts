import "server-only";
import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq, isNotNull } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import {
  vendors,
  vendorMembers,
  type Vendor,
  type VendorMember,
} from "@/lib/db/schema";
import { getVendorByMemberClerkUserId } from "@/lib/queries/vendors";

/**
 * Closed shape — vendor is guaranteed non-null because the onboarded
 * gate has already fired. This is the default for every dashboard
 * page that doesn't explicitly opt out.
 */
export type VendorSession = {
  vendor: Vendor;
  vendorMember: VendorMember;
  user: { id: string; name: string; email: string | null };
};

/**
 * Open shape — vendor may be null. Used by the onboarding pages
 * themselves, where a brand-new sign-in legitimately has a
 * vendor_members row but no vendor row yet.
 */
export type VendorSessionOpen = {
  vendor: Vendor | null;
  vendorMember: VendorMember;
  user: { id: string; name: string; email: string | null };
};

export type DemoOverride = "new" | "returning";

/**
 * Resolve the current vendor session.
 *
 * `requireOnboarded` defaults to TRUE — every dashboard page is
 * assumed to need a fully onboarded vendor unless it opts out. The
 * onboarding pages (/dashboard/onboarding, /dashboard/onboarding/
 * submit, /dashboard/onboarding/complete) MUST pass
 * `requireOnboarded: false` or they redirect-loop.
 *
 * The strict default is deliberate: future dashboard subroutes
 * can't accidentally skip the gate by forgetting to set the
 * option.
 *
 * Overload signatures encode the contract: callers using the
 * default (or explicit true) get VendorSession with non-null
 * vendor. Callers passing false get VendorSessionOpen with
 * possibly-null vendor.
 *
 * In demo mode (NEXT_PUBLIC_DEMO_MODE=true and not production) we
 * short-circuit Clerk and synthesise a session from a deterministic
 * seeded vendor. The synthesis no longer pulls from
 * vendors.onboarded (that column is being dropped) — instead it
 * picks the first vendor with at least one member-bearing app
 * relation, falling back to the first vendor by id. Slightly
 * degraded vs the old conflated model, by design.
 */
export async function getVendorSession(opts?: {
  demoOverride?: DemoOverride;
}): Promise<VendorSession>;
export async function getVendorSession(opts: {
  demoOverride?: DemoOverride;
  requireOnboarded: false;
}): Promise<VendorSessionOpen>;
export async function getVendorSession(opts: {
  demoOverride?: DemoOverride;
  requireOnboarded: true;
}): Promise<VendorSession>;
export async function getVendorSession(opts?: {
  demoOverride?: DemoOverride;
  requireOnboarded?: boolean;
}): Promise<VendorSession | VendorSessionOpen> {
  const requireOnboarded = opts?.requireOnboarded ?? true;

  if (env.DEMO_MODE) {
    const wantOnboarded = opts?.demoOverride !== "new";
    // Demo bypass: pick the first onboarded member if any exist (dev
    // box may have created one via a real test sign-in), else
    // synthesise from the first seeded vendor.
    if (wantOnboarded) {
      const [memberRow] = await db
        .select({ member: vendorMembers, vendor: vendors })
        .from(vendorMembers)
        .leftJoin(vendors, eq(vendors.id, vendorMembers.vendorId))
        .where(eq(vendorMembers.onboarded, true))
        .limit(1);
      if (memberRow && memberRow.vendor) {
        return makeSession(memberRow.vendor, memberRow.member);
      }
      const [vendorRow] = await db
        .select()
        .from(vendors)
        .orderBy(vendors.id)
        .limit(1);
      if (!vendorRow) redirect("/login?error=no_demo_vendor");
      return makeSession(vendorRow, syntheticMember(vendorRow));
    }

    // demoOverride === "new" — preview the onboarding gate. Open shape.
    const fakeMember: VendorMember = {
      id: -1,
      vendorId: null,
      clerkUserId: "demo_new_user",
      name: "Demo New User",
      primaryEmail: "demo+new@example.com",
      linkedinUrl: null,
      role: null,
      onboarded: false,
      suspended: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (requireOnboarded) redirect("/dashboard/onboarding");
    return {
      vendor: null,
      vendorMember: fakeMember,
      user: {
        id: fakeMember.clerkUserId,
        name: fakeMember.name,
        email: fakeMember.primaryEmail,
      },
    };
  }

  const { userId } = await auth();
  if (!userId) redirect("/login");

  let result = await getVendorByMemberClerkUserId(userId);
  if (!result) {
    // Webhook-failure fallback. The Clerk webhook is the canonical
    // creator of vendor_members rows on user.created — but it's
    // best-effort delivery (network hiccups, signing-secret
    // rotations, dev-mode tunnels, etc.). When it fails, the user
    // has a valid Clerk session but no DB row, and would otherwise
    // dead-end at /login?error=no_vendor with no recovery path. Try
    // to repair inline using Clerk's user object as the source of
    // truth.
    result = await lazyCreateVendorMemberFromClerk(userId);
  }
  if (!result) redirect("/login?error=no_vendor");

  const { vendor, vendorMember } = result;
  if (vendorMember.suspended) redirect("/login?error=suspended");

  // PR B.2.1 — onboarding is now a modal mounted in the dashboard
  // layout, not a page redirect. Letting !onboarded users render
  // dashboard pages underneath the modal is intentional: the modal
  // blocks all interaction until they accept legal, then the page
  // re-renders cleanly via router.refresh(). The previous redirect
  // here would interrupt the layout SSR before the modal could mount.

  if (requireOnboarded) {
    // Closed-shape callers still need a non-null vendor row. After
    // legal acceptance the user typically has onboarded=true but no
    // vendor row yet (the company-info wizard is a separate step);
    // bounce them to the onboarding welcome page so they can start
    // the wizard. The welcome page itself uses the open shape and
    // tolerates vendor=null.
    if (!vendor) redirect("/dashboard/onboarding");
    return {
      vendor,
      vendorMember,
      user: {
        id: userId,
        name: vendorMember.name,
        email: vendorMember.primaryEmail,
      },
    };
  }

  // Open shape — caller asked for it explicitly.
  return {
    vendor,
    vendorMember,
    user: {
      id: userId,
      name: vendorMember.name,
      email: vendorMember.primaryEmail,
    },
  };
}

export const isDemoOverride = (v: unknown): v is DemoOverride =>
  v === "new" || v === "returning";

function makeSession(vendor: Vendor, vendorMember: VendorMember): VendorSession {
  return {
    vendor,
    vendorMember,
    user: {
      id: vendorMember.clerkUserId,
      name: vendorMember.name,
      email: vendorMember.primaryEmail,
    },
  };
}

/** Used only by the DEMO_MODE returning-vendor path when no real
 *  vendor_members row exists yet. */
function syntheticMember(vendor: Vendor): VendorMember {
  return {
    id: -1,
    vendorId: vendor.id,
    clerkUserId: `demo_${vendor.id}`,
    name: vendor.name,
    primaryEmail: vendor.contactEmail ?? `demo_${vendor.id}@unknown.example`,
    linkedinUrl: null,
    role: null,
    onboarded: true,
    suspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Layout-friendly header data resolver.
 *
 * Layouts can't see searchParams (so they can't honour ?as= demo
 * overrides) and can't redirect (it'd preempt the page render).
 * This returns sensible header props in all states; the page
 * itself is responsible for the actual auth gate via
 * getVendorSession().
 *
 * Resolution order:
 *   • Real Clerk session → vendor_member.name (always set), vendor.name when present
 *   • DEMO_MODE on → first onboarded member, else first vendor
 *   • Anything else → "—" placeholder
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
      const result = await getVendorByMemberClerkUserId(userId);
      if (result) {
        const { vendor, vendorMember } = result;
        return {
          companyName: vendor?.name ?? "—",
          userName: vendorMember.name,
          userInitials: initialsOf(vendorMember.name),
          userTitle: vendorMember.role,
        };
      }
    }
  } catch {
    // No middleware yet, or unauthenticated. Fall through.
  }

  if (env.DEMO_MODE) {
    // First onboarded member → that's the most truthful demo state.
    const [row] = await db
      .select({ member: vendorMembers, vendor: vendors })
      .from(vendorMembers)
      .leftJoin(vendors, eq(vendors.id, vendorMembers.vendorId))
      .where(eq(vendorMembers.onboarded, true))
      .limit(1);
    if (row?.vendor) {
      return {
        companyName: row.vendor.name,
        userName: row.member.name,
        userInitials: initialsOf(row.member.name),
        userTitle: row.member.role,
      };
    }
    // Else fall back to first vendor row, with a placeholder member.
    const [vendorRow] = await db
      .select()
      .from(vendors)
      .orderBy(vendors.id)
      .limit(1);
    if (vendorRow) {
      return {
        companyName: vendorRow.name,
        userName: vendorRow.name,
        userInitials: initialsOf(vendorRow.name),
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

/**
 * Inline vendor_members-row creation from a Clerk user object.
 *
 * Used as a fallback when the user.created webhook didn't run or
 * failed. Same shape the webhook handler produces, so a lazy-
 * created row is indistinguishable from a webhook-created one.
 *
 * onConflictDoNothing on clerk_user_id means a concurrent webhook
 * insert can't deadlock — whichever side wins the race is fine, the
 * loser re-fetches and returns the existing row.
 *
 * Returns null on any failure so callers fall through to the
 * existing /login?error=no_vendor redirect rather than throwing
 * inside getVendorSession.
 *
 * NOTE: this creates a vendor_members row only — vendor_id stays
 * NULL. The /dashboard/onboarding flow inserts a vendors row and
 * repoints vendor_id when the human confirms their company.
 */
async function lazyCreateVendorMemberFromClerk(
  userId: string,
): Promise<{ vendor: Vendor | null; vendorMember: VendorMember } | null> {
  try {
    const cc = await clerkClient();
    const u = await cc.users.getUser(userId);

    const fullName =
      [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unnamed vendor";
    const primary = u.emailAddresses.find(
      (e) => e.id === u.primaryEmailAddressId,
    );
    const email =
      primary?.emailAddress ??
      u.emailAddresses[0]?.emailAddress ??
      `${userId}@unknown.example`;

    await db
      .insert(vendorMembers)
      .values({
        vendorId: null,
        clerkUserId: userId,
        name: fullName,
        primaryEmail: email,
        onboarded: false,
      })
      .onConflictDoNothing({ target: vendorMembers.clerkUserId });

    // Re-fetch — covers both our successful insert AND a concurrent
    // webhook insert that won the conflict.
    return await getVendorByMemberClerkUserId(userId);
  } catch (err) {
    console.error("[session] lazyCreateVendorMemberFromClerk failed", err);
    return null;
  }
}

// Quiet the lint/type checker about isNotNull import retention —
// reserved for follow-on commits that filter members by vendor_id.
void isNotNull;
