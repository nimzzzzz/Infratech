import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { vendorMembers, vendors } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { listVendorLeadershipContacts } from "@/lib/queries/vendor-leadership";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { userId } = await auth();
  if (!userId && !env.DEMO_MODE) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const [member] = userId
    ? await db
        .select({
          id: vendorMembers.id,
          vendorId: vendorMembers.vendorId,
          onboarded: vendorMembers.onboarded,
          suspended: vendorMembers.suspended,
        })
        .from(vendorMembers)
        .where(eq(vendorMembers.clerkUserId, userId))
        .limit(1)
    : [{ id: -1, vendorId: -1, onboarded: true, suspended: false }];

  if (!member || member.suspended || !member.onboarded || !member.vendorId) {
    return NextResponse.json({ error: "Account required" }, { status: 403 });
  }

  const { slug } = await params;
  const [vendor] = await db
    .select({ id: vendors.id, suspended: vendors.suspended })
    .from(vendors)
    .where(eq(vendors.slug, slug))
    .limit(1);

  if (!vendor || vendor.suspended) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const people = await listVendorLeadershipContacts(vendor.id);
  return NextResponse.json({ people });
}
