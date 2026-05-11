import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  vendorMembers,
  vendorMemberLegalAcceptances,
} from "@/lib/db/schema";
import {
  __resetVendorMemberRateLimitForTests,
  checkVendorMemberRateLimit,
} from "@/lib/rate-limit/vendor-member";
import { TERMS_VERSION } from "@/lib/legal/terms-version";

/**
 * Module-boundary mocks.
 *
 * @clerk/nextjs/server.auth() returns a userId we control per-test;
 * the route's first action is to look up the matching vendor_members
 * row by clerk_user_id, so we seed a row with the same id in each
 * test and the lookup succeeds.
 */
const authMock = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: authMock.userId })),
}));

beforeEach(() => {
  authMock.userId = null;
  __resetVendorMemberRateLimitForTests();
});

async function seedMember(opts: {
  clerkUserId: string;
  onboarded?: boolean;
  suspended?: boolean;
}): Promise<{ id: number }> {
  const [row] = await db
    .insert(vendorMembers)
    .values({
      vendorId: null,
      clerkUserId: opts.clerkUserId,
      name: "Test Member",
      primaryEmail: `${opts.clerkUserId}@test.example`,
      onboarded: opts.onboarded ?? false,
      suspended: opts.suspended ?? false,
    })
    .returning({ id: vendorMembers.id });
  return row;
}

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/onboarding/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "10.0.0.50",
      "user-agent": "Vitest/1.0",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const validBody = (overrides: Record<string, unknown> = {}) => ({
  acceptedTerms: true,
  termsVersion: TERMS_VERSION,
  ...overrides,
});

describe("bodySchema (unit)", () => {
  it("accepts a valid payload (with optional honeypot)", async () => {
    const { onboardingConfirmBodySchema: bodySchema } = await import(
      "@/app/api/onboarding/confirm/schema"
    );
    const ok = bodySchema.safeParse({
      acceptedTerms: true,
      termsVersion: TERMS_VERSION,
      website2: "",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects missing termsVersion", async () => {
    const { onboardingConfirmBodySchema: bodySchema } = await import(
      "@/app/api/onboarding/confirm/schema"
    );
    const r = bodySchema.safeParse({ acceptedTerms: true });
    expect(r.success).toBe(false);
  });

  it("rejects non-boolean acceptedTerms", async () => {
    const { onboardingConfirmBodySchema: bodySchema } = await import(
      "@/app/api/onboarding/confirm/schema"
    );
    const r = bodySchema.safeParse({
      acceptedTerms: "yes",
      termsVersion: TERMS_VERSION,
    });
    expect(r.success).toBe(false);
  });
});

describe("checkVendorMemberRateLimit (unit)", () => {
  it("allows the first 5 calls and blocks the 6th within the window", () => {
    const id = 99999;
    for (let i = 0; i < 5; i++) {
      expect(checkVendorMemberRateLimit(id)).toBe(true);
    }
    expect(checkVendorMemberRateLimit(id)).toBe(false);
  });

  it("different ids have independent buckets", () => {
    for (let i = 0; i < 5; i++) checkVendorMemberRateLimit(11111);
    expect(checkVendorMemberRateLimit(22222)).toBe(true);
  });

  it("resets after the window expires", () => {
    const id = 33333;
    const t0 = 1_000_000_000_000;
    for (let i = 0; i < 5; i++) checkVendorMemberRateLimit(id, t0);
    expect(checkVendorMemberRateLimit(id, t0)).toBe(false);
    // Past the 1h window — bucket evicted, fresh allow.
    expect(checkVendorMemberRateLimit(id, t0 + 60 * 60 * 1000 + 1)).toBe(true);
  });
});

describe("POST /api/onboarding/confirm — happy path", () => {
  it("200 + flips onboarded=true + writes audit row", async () => {
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    const member = await seedMember({ clerkUserId: "user_happy_1" });
    authMock.userId = "user_happy_1";

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const [updated] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.id, member.id));
    expect(updated.onboarded).toBe(true);

    const audits = await db
      .select()
      .from(vendorMemberLegalAcceptances)
      .where(eq(vendorMemberLegalAcceptances.vendorMemberId, member.id));
    expect(audits.length).toBe(1);
    expect(audits[0].termsVersion).toBe(TERMS_VERSION);
    expect(audits[0].ipAddress).toBe("10.0.0.50");
    expect(audits[0].userAgent).toBe("Vitest/1.0");
  });
});

describe("POST /api/onboarding/confirm — auth & lookup", () => {
  it("401 when not signed in", async () => {
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    authMock.userId = null;
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(401);
  });

  it("404 when vendor_members row is missing", async () => {
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    authMock.userId = "user_no_row";
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(404);
  });

  it("403 when member is suspended", async () => {
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    await seedMember({ clerkUserId: "user_susp", suspended: true });
    authMock.userId = "user_susp";
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(403);
  });

  it("200 idempotent when current version already accepted — no second audit row", async () => {
    // Per-version idempotency (Phase B.2 PR 2): an already-onboarded
    // member who has an audit row for the CURRENT terms version sees
    // the route 200 without writing a duplicate. Members whose latest
    // accepted version is OLDER fall through to an additive INSERT
    // (re-acceptance flow).
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    const member = await seedMember({
      clerkUserId: "user_already",
      onboarded: true,
    });
    await db.insert(vendorMemberLegalAcceptances).values({
      vendorMemberId: member.id,
      termsVersion: TERMS_VERSION,
    });
    authMock.userId = "user_already";

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(vendorMemberLegalAcceptances)
      .where(eq(vendorMemberLegalAcceptances.vendorMemberId, member.id));
    // Should remain at 1 — the pre-seeded row only.
    expect(n).toBe(1);
  });

  it("re-acceptance: stale audit row + current-version POST → 200 + additive insert", async () => {
    // Mirror of the above for the re-acceptance path. Member's only
    // existing audit row is for an old version; the route should
    // INSERT a new row at TERMS_VERSION rather than 200-no-op.
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    const member = await seedMember({
      clerkUserId: "user_reaccept",
      onboarded: true,
    });
    await db.insert(vendorMemberLegalAcceptances).values({
      vendorMemberId: member.id,
      termsVersion: "1999-01-01",
      acceptedAt: new Date("1999-01-01"),
    });
    authMock.userId = "user_reaccept";

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    const rows = await db
      .select()
      .from(vendorMemberLegalAcceptances)
      .where(eq(vendorMemberLegalAcceptances.vendorMemberId, member.id));
    expect(rows.length).toBe(2);
    expect(rows.some((r) => r.termsVersion === TERMS_VERSION)).toBe(true);
  });
});

describe("POST /api/onboarding/confirm — body validation", () => {
  it("409 on terms-version mismatch", async () => {
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    const member = await seedMember({ clerkUserId: "user_mismatch" });
    authMock.userId = "user_mismatch";

    const res = await POST(
      makeRequest(validBody({ termsVersion: "1900-01-01" })),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.currentVersion).toBe(TERMS_VERSION);

    // No write happened.
    const [updated] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.id, member.id));
    expect(updated.onboarded).toBe(false);
  });

  it("422 when acceptedTerms is false", async () => {
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    const member = await seedMember({ clerkUserId: "user_refuse" });
    authMock.userId = "user_refuse";

    const res = await POST(makeRequest(validBody({ acceptedTerms: false })));
    expect(res.status).toBe(422);
    const [updated] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.id, member.id));
    expect(updated.onboarded).toBe(false);
  });

  it("400 with fieldErrors on malformed body", async () => {
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    await seedMember({ clerkUserId: "user_bad_body" });
    authMock.userId = "user_bad_body";

    const res = await POST(
      makeRequest({ acceptedTerms: "yes", termsVersion: 7 }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors).toBeTruthy();
  });
});

describe("POST /api/onboarding/confirm — honeypot", () => {
  it("filled honeypot → 200 success but no DB write", async () => {
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    const member = await seedMember({ clerkUserId: "user_honey" });
    authMock.userId = "user_honey";

    const res = await POST(
      makeRequest(validBody({ website2: "https://spam.example/" })),
    );
    expect(res.status).toBe(200);

    const [updated] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.id, member.id));
    expect(updated.onboarded).toBe(false);

    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(vendorMemberLegalAcceptances)
      .where(eq(vendorMemberLegalAcceptances.vendorMemberId, member.id));
    expect(n).toBe(0);
  });
});

describe("POST /api/onboarding/confirm — rate limiting", () => {
  it("6th hit from the same vendor_member returns 429", async () => {
    const { POST } = await import("@/app/api/onboarding/confirm/route");
    // Fresh member each test (tx rollback), so hit it five times with
    // the SAME idempotent body. The first call flips onboarded=true and
    // every subsequent call short-circuits at the idempotency check
    // BEFORE the rate limiter — that's the wrong target. Instead use a
    // mismatched termsVersion so each request fails at 409 *after* the
    // rate-limit gate, exhausting the bucket.
    //
    // Wait — actually 409 is checked BEFORE the rate-limit gate too.
    // Use an acceptedTerms=false body: that lands at 422 *after* the
    // limiter increments. Confirmed by reading the route's order of
    // operations: idempotency → version → acceptedTerms → rate-limit.
    //
    // Hmm — re-reading: rate limit is between acceptedTerms check and
    // the DB transaction. So acceptedTerms=false stops *before* the
    // limiter. Use the only path that reaches the limiter without
    // mutating state: a brand-new member that we onboard repeatedly
    // by NOT using the idempotency short-circuit. The cleanest is to
    // reseed each iteration with a different clerk_user_id — but the
    // limiter is keyed on vendor_member.id, so we need the SAME id.
    //
    // The straightforward path: call the route 5 times with valid
    // bodies using the SAME member id. The first succeeds, the next
    // four hit the idempotency 200 (which short-circuits before the
    // limiter). The 6th would also short-circuit. So the route's order
    // means rate-limiting is effectively only exercised in tandem with
    // the path that flips onboarded — which is one shot per member.
    //
    // To test the limiter through the HTTP boundary we'd need to reset
    // member.onboarded between calls. Do that explicitly:
    const member = await seedMember({ clerkUserId: "user_rl" });
    authMock.userId = "user_rl";

    for (let i = 0; i < 5; i++) {
      const r = await POST(makeRequest(validBody()));
      expect(r.status).toBe(200);
      // Reset onboarded so the next call gets past the idempotency
      // check and hits the limiter.
      await db
        .update(vendorMembers)
        .set({ onboarded: false })
        .where(eq(vendorMembers.id, member.id));
    }

    const sixth = await POST(makeRequest(validBody()));
    expect(sixth.status).toBe(429);
  });
});
