import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  vendorMembers,
  vendorMemberLegalAcceptances,
} from "@/lib/db/schema";
import {
  getLatestAcceptedVersion,
  needsReacceptance,
} from "@/lib/legal/check-acceptance";
import { TERMS_VERSION } from "@/lib/legal/terms-version";

async function seedMember(clerkUserId: string) {
  const [row] = await db
    .insert(vendorMembers)
    .values({
      clerkUserId,
      name: "Test User",
      primaryEmail: `${clerkUserId}@test.example`,
      onboarded: true,
    })
    .returning({ id: vendorMembers.id });
  return row.id;
}

async function seedAcceptance(memberId: number, version: string, when?: Date) {
  await db.insert(vendorMemberLegalAcceptances).values({
    vendorMemberId: memberId,
    termsVersion: version,
    acceptedAt: when ?? new Date(),
  });
}

describe("getLatestAcceptedVersion", () => {
  it("returns null when the member has never accepted", async () => {
    const id = await seedMember("user_no_accept");
    expect(await getLatestAcceptedVersion(id)).toBeNull();
  });

  it("returns the most recent version when multiple acceptances exist", async () => {
    const id = await seedMember("user_multi");
    await seedAcceptance(id, "2025-01-01", new Date("2025-01-01"));
    await seedAcceptance(id, "2025-06-01", new Date("2025-06-01"));
    await seedAcceptance(id, "2024-12-31", new Date("2024-12-31"));
    expect(await getLatestAcceptedVersion(id)).toBe("2025-06-01");
  });
});

describe("needsReacceptance", () => {
  it("returns false when member has never accepted (first-sign-in path covers it)", async () => {
    const id = await seedMember("user_never");
    expect(await needsReacceptance(id)).toBe(false);
  });

  it("returns false when latest accepted version === TERMS_VERSION", async () => {
    const id = await seedMember("user_current");
    await seedAcceptance(id, TERMS_VERSION);
    expect(await needsReacceptance(id)).toBe(false);
  });

  it("returns true when latest accepted version is older than TERMS_VERSION", async () => {
    const id = await seedMember("user_stale");
    await seedAcceptance(id, "1999-01-01", new Date("1999-01-01"));
    expect(await needsReacceptance(id)).toBe(true);
  });

  it("ignores older acceptances when a newer one matches the live version", async () => {
    const id = await seedMember("user_mixed");
    await seedAcceptance(id, "1999-01-01", new Date("1999-01-01"));
    await seedAcceptance(id, TERMS_VERSION);
    expect(await needsReacceptance(id)).toBe(false);
  });
});
