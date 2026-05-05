import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
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
 * `requireOnboarded` enforces vendor.onboarded === true. Set this on
 * pages that assume the company-confirm step has happened. Pages
 * inside /dashboard/onboarding/** should pass false.
 */
export async function getVendorSession(opts?: {
  demoOverride?: DemoOverride;
  requireOnboarded?: boolean;
}): Promise<VendorSession> {
  const requireOnboarded = opts?.requireOnboarded ?? false;

  if (env.DEMO_MODE && opts?.demoOverride !== undefined) {
    const wantOnboarded = opts.demoOverride === "returning";
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

  const vendor = await getVendorByClerkUserId(userId);
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
