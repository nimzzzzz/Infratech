import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { vendorMemberLegalAcceptances } from "@/lib/db/schema";
import { TERMS_VERSION } from "./terms-version";

/**
 * Returns the most recently accepted terms_version string for a given
 * vendor_member, or null if they've never accepted anything.
 *
 * Terms versions are date-format strings ("YYYY-MM-DD"), so lexical
 * comparison sorts them correctly — no parsing required.
 */
export async function getLatestAcceptedVersion(
  vendorMemberId: number,
): Promise<string | null> {
  const [row] = await db
    .select({ termsVersion: vendorMemberLegalAcceptances.termsVersion })
    .from(vendorMemberLegalAcceptances)
    .where(eq(vendorMemberLegalAcceptances.vendorMemberId, vendorMemberId))
    .orderBy(desc(vendorMemberLegalAcceptances.acceptedAt))
    .limit(1);
  return row?.termsVersion ?? null;
}

/**
 * True iff the vendor_member has accepted at least one version BUT
 * their latest accepted version is older than the live TERMS_VERSION.
 *
 * Note: returns false when the member has accepted NOTHING ever — that
 * state is handled by the first-sign-in modal flow (initialOnboarded
 * = false), not the re-acceptance flow.
 */
export async function needsReacceptance(
  vendorMemberId: number,
): Promise<boolean> {
  const latest = await getLatestAcceptedVersion(vendorMemberId);
  if (latest === null) return false;
  return latest < TERMS_VERSION;
}
