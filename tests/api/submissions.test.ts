import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  apps,
  submissions,
  vendorMembers,
  vendorMemberLegalAcceptances,
  vendors,
} from "@/lib/db/schema";
import {
  __resetVendorMemberRateLimitForTests,
} from "@/lib/rate-limit/vendor-member";
import { TERMS_VERSION } from "@/lib/legal/terms-version";

/**
 * Mock @clerk/nextjs/server.auth() to return a userId we control.
 * Same pattern as tests/api/onboarding-confirm.test.ts.
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
  vendorId?: number | null;
  onboarded?: boolean;
  suspended?: boolean;
  acceptCurrentTerms?: boolean;
}): Promise<{ id: number; vendorId: number | null }> {
  const [row] = await db
    .insert(vendorMembers)
    .values({
      vendorId: opts.vendorId ?? null,
      clerkUserId: opts.clerkUserId,
      name: "Test Member",
      primaryEmail: `${opts.clerkUserId}@test.example`,
      onboarded: opts.onboarded ?? true,
      suspended: opts.suspended ?? false,
    })
    .returning({ id: vendorMembers.id, vendorId: vendorMembers.vendorId });
  if (opts.acceptCurrentTerms !== false) {
    await db.insert(vendorMemberLegalAcceptances).values({
      vendorMemberId: row.id,
      termsVersion: TERMS_VERSION,
    });
  }
  return row;
}

async function seedVendor(slug: string): Promise<number> {
  const [row] = await db
    .insert(vendors)
    .values({ slug, name: `Vendor ${slug}` })
    .returning({ id: vendors.id });
  return row.id;
}

const validProduct = (overrides: Record<string, unknown> = {}) => ({
  name: "Northstrand Field",
  url: "https://northstrand.example.com",
  tagline: "Schedule risk analysis trained on completed projects.",
  description:
    "Plain English description of what the product does. No HTML allowed.",
  stages: ["delivery"],
  capabilities: ["risk-management"],
  industries: ["construction"],
  pricing: "user-subscription-freemium",
  ...overrides,
});

const validCompany = (overrides: Record<string, unknown> = {}) => ({
  companyName: "Northstrand Inc",
  companyWebsite: "https://northstrand.example.com",
  companyFounded: "2018",
  companyHeadquarters: "United Kingdom",
  companyRegions: ["emea"],
  companyDescription: "Plain English description of the company.",
  ...overrides,
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/submissions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "10.0.0.50",
      "user-agent": "Vitest/1.0",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/submissions — happy paths", () => {
  it("vendor-less user: creates vendor + submission in one tx, returns redirectUrl with product name", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const member = await seedMember({
      clerkUserId: "user_new_signup",
      vendorId: null,
    });
    authMock.userId = "user_new_signup";

    const res = await POST(
      makeRequest({ ...validCompany(), ...validProduct() }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.submissionId).toBeTypeOf("number");
    expect(json.vendorId).toBeTypeOf("number");
    expect(json.redirectUrl).toMatch(
      /^\/dashboard\/onboarding\/submitted\?name=/,
    );

    // Vendor row created with slug derived from companyName.
    const [vendorRow] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, json.vendorId));
    expect(vendorRow.slug).toBe("northstrand-inc");
    expect(vendorRow.name).toBe("Northstrand Inc");
    expect(vendorRow.shortBlurb).toBeNull(); // override: leave null per spec
    expect(vendorRow.foundedYear).toBe(2018);

    // vendor_members.vendor_id was repointed.
    const [memberRow] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.id, member.id));
    expect(memberRow.vendorId).toBe(json.vendorId);

    // Submission row created with status pending, type new, payload populated.
    const [subRow] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, json.submissionId));
    expect(subRow.status).toBe("pending");
    expect(subRow.type).toBe("new");
    expect(subRow.submitterVendorId).toBe(json.vendorId);
    const payload = subRow.payload as { slug: string; name: string };
    expect(payload.slug).toBe("northstrand-field");
    expect(payload.name).toBe("Northstrand Field");
  });

  it("returning vendor: creates submission only, no new vendor row", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("returning-vendor");
    const member = await seedMember({
      clerkUserId: "user_returning",
      vendorId,
    });
    authMock.userId = "user_returning";

    const vendorsBefore = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(vendors);

    // Returning vendors send company fields through anyway; route
    // ignores them. Use schema-valid values so Zod doesn't 400 us.
    const res = await POST(
      makeRequest({
        ...validCompany({
          companyName: "Should Be Ignored",
          companyWebsite: "https://ignored.example",
        }),
        ...validProduct({ name: "Second Product" }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.vendorId).toBe(vendorId);

    // No new vendor row.
    const vendorsAfter = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(vendors);
    expect(vendorsAfter[0].n).toBe(vendorsBefore[0].n);

    // Submission row points at the existing vendor.
    const [subRow] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, json.submissionId));
    expect(subRow.submitterVendorId).toBe(vendorId);
    void member; // satisfy noUnusedLocals
  });
});

describe("POST /api/submissions — validation & lookup", () => {
  it("401 when not signed in", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    authMock.userId = null;
    const res = await POST(makeRequest({ ...validCompany(), ...validProduct() }));
    expect(res.status).toBe(401);
  });

  it("404 when vendor_members row is missing", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    authMock.userId = "user_ghost";
    const res = await POST(makeRequest({ ...validCompany(), ...validProduct() }));
    expect(res.status).toBe(404);
  });

  it("403 when member is suspended", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    await seedMember({
      clerkUserId: "user_susp",
      suspended: true,
    });
    authMock.userId = "user_susp";
    const res = await POST(makeRequest({ ...validCompany(), ...validProduct() }));
    expect(res.status).toBe(403);
  });

  it("400 with fieldErrors on invalid Zod payload (missing name)", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-zod");
    await seedMember({ clerkUserId: "user_zod", vendorId });
    authMock.userId = "user_zod";

    const res = await POST(
      makeRequest({ ...validCompany(), ...validProduct({ name: "" }) }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors.name).toBeTruthy();
  });

  it("400 on HTML in a plain-text field (defence-in-depth)", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-html");
    await seedMember({ clerkUserId: "user_html", vendorId });
    authMock.userId = "user_html";

    const res = await POST(
      makeRequest({
        ...validCompany(),
        ...validProduct({ description: "Contains <script>alert(1)</script>" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("422 when vendor-less user omits company fields", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    await seedMember({ clerkUserId: "user_no_company", vendorId: null });
    authMock.userId = "user_no_company";

    const res = await POST(
      makeRequest({
        ...validProduct(),
        // no company* fields
      }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.fieldErrors.companyName).toBeTruthy();
  });
});

describe("POST /api/submissions — slug collisions", () => {
  it("409 slug_taken on duplicate app slug", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("vendor-clash");
    await seedMember({ clerkUserId: "user_app_clash", vendorId });
    authMock.userId = "user_app_clash";

    // Pre-seed an app with the slug we're about to try.
    await db.insert(apps).values({
      slug: "northstrand-field",
      vendorId,
      name: "Northstrand Field",
      websiteUrl: "https://northstrand.example",
      status: "published",
    });

    const res = await POST(
      makeRequest({ ...validCompany(), ...validProduct() }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("slug_taken");
    expect(json.which).toBe("app");
    expect(json.slug).toBe("northstrand-field");
  });

  it("409 slug_taken on duplicate vendor slug (vendor-less user case)", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    await seedMember({ clerkUserId: "user_vend_clash", vendorId: null });
    authMock.userId = "user_vend_clash";

    // Pre-seed a vendor with the slug we'll derive.
    await seedVendor("northstrand-inc");

    const res = await POST(
      makeRequest({ ...validCompany(), ...validProduct() }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("slug_taken");
    expect(json.which).toBe("vendor");
    expect(json.slug).toBe("northstrand-inc");
  });
});

describe("POST /api/submissions — honeypot, rate limit, re-acceptance", () => {
  it("honeypot filled → 200 success but no DB writes", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-honey");
    await seedMember({ clerkUserId: "user_honey_subm", vendorId });
    authMock.userId = "user_honey_subm";

    const subsBefore = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(submissions);

    const res = await POST(
      makeRequest({
        ...validCompany(),
        ...validProduct(),
        website3: "https://spam.example/",
      }),
    );
    expect(res.status).toBe(200);

    const subsAfter = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(submissions);
    expect(subsAfter[0].n).toBe(subsBefore[0].n);
  });

  it("6th submission from same vendor_member within the hour returns 429", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-rl");
    await seedMember({ clerkUserId: "user_rl_subm", vendorId });
    authMock.userId = "user_rl_subm";

    for (let i = 0; i < 5; i++) {
      const r = await POST(
        makeRequest({
          ...validCompany(),
          ...validProduct({ name: `Product ${i}` }),
        }),
      );
      expect(r.status).toBe(200);
    }
    const sixth = await POST(
      makeRequest({
        ...validCompany(),
        ...validProduct({ name: "Product 6" }),
      }),
    );
    expect(sixth.status).toBe(429);
  });

  it("409 version_mismatch when latest accepted version is stale", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-version");
    const member = await seedMember({
      clerkUserId: "user_stale",
      vendorId,
      acceptCurrentTerms: false,
    });
    // Acceptance from a prehistoric version.
    await db.insert(vendorMemberLegalAcceptances).values({
      vendorMemberId: member.id,
      termsVersion: "1999-01-01",
      acceptedAt: new Date("1999-01-01"),
    });
    authMock.userId = "user_stale";

    const res = await POST(
      makeRequest({ ...validCompany(), ...validProduct() }),
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("version_mismatch");
    expect(json.currentVersion).toBe(TERMS_VERSION);
  });
});

describe("hasRealHostname (unit) — rejects dotless hostnames", () => {
  it("rejects bare hostnames with no dot", async () => {
    const { hasRealHostname, normaliseUrl } = await import(
      "@/lib/submissions/url"
    );
    // "rr" → "https://rr" → parses but hostname has no dot.
    expect(hasRealHostname(normaliseUrl("rr"))).toBe(false);
    expect(hasRealHostname(normaliseUrl("example"))).toBe(false);
    expect(hasRealHostname(normaliseUrl("localhost"))).toBe(false);
  });

  it("accepts hostnames with a dot + alphabetic TLD ≥2 chars", async () => {
    const { hasRealHostname, normaliseUrl } = await import(
      "@/lib/submissions/url"
    );
    expect(hasRealHostname(normaliseUrl("example.com"))).toBe(true);
    expect(hasRealHostname("https://example.co.uk")).toBe(true);
    expect(hasRealHostname("https://sub.example.com/path?q=1")).toBe(true);
  });

  it("rejects raw IPv4 addresses (TLD would be numeric)", async () => {
    const { hasRealHostname } = await import("@/lib/submissions/url");
    expect(hasRealHostname("https://192.168.1.1")).toBe(false);
  });

  it("rejects unparseable strings", async () => {
    const { hasRealHostname } = await import("@/lib/submissions/url");
    expect(hasRealHostname("not a url")).toBe(false);
    expect(hasRealHostname("")).toBe(false);
  });
});

describe("POST /api/submissions — hostname refinement (integration)", () => {
  it("rejects a dotless hostname even though it parses as a URL", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-rr-host");
    await seedMember({ clerkUserId: "user_rr_host", vendorId });
    authMock.userId = "user_rr_host";

    const res = await POST(
      makeRequest({
        ...validCompany(),
        ...validProduct({ url: "rr" }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors.url).toBeTruthy();
    expect(json.fieldErrors.url[0]).toMatch(/valid web address/i);
  });

  it("accepts a multi-part TLD like .co.uk end-to-end", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-couk-host");
    await seedMember({ clerkUserId: "user_couk_host", vendorId });
    authMock.userId = "user_couk_host";

    const res = await POST(
      makeRequest({
        ...validCompany(),
        ...validProduct({
          name: "Co Uk Product",
          url: "https://example.co.uk",
        }),
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/submissions — URL normalisation", () => {
  it("accepts a bare hostname and normalises to https:// in the persisted payload", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-url-norm");
    await seedMember({ clerkUserId: "user_url_norm", vendorId });
    authMock.userId = "user_url_norm";

    const res = await POST(
      makeRequest({
        ...validCompany(),
        ...validProduct({
          name: "UrlNorm Product",
          // No scheme — the schema's .transform(normaliseUrl).pipe(z.url())
          // should accept this, prepend https://, then pass URL validation.
          url: "example.com",
        }),
      }),
    );
    expect(res.status).toBe(200);

    const [latest] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.submitterVendorId, vendorId))
      .orderBy(desc(submissions.submittedAt))
      .limit(1);
    const payload = latest.payload as { url: string };
    expect(payload.url).toBe("https://example.com");
  });

  it("rejects truly malformed URL strings", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-bad-url");
    await seedMember({ clerkUserId: "user_bad_url", vendorId });
    authMock.userId = "user_bad_url";

    // "not a url" → "https://not a url" → fails URL parse → 400.
    const res = await POST(
      makeRequest({
        ...validCompany(),
        ...validProduct({ url: "not a url" }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors.url).toBeTruthy();
  });

  it("preserves an already-prefixed URL untouched", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-keep-url");
    await seedMember({ clerkUserId: "user_keep_url", vendorId });
    authMock.userId = "user_keep_url";

    const res = await POST(
      makeRequest({
        ...validCompany(),
        ...validProduct({
          name: "Keep Url",
          url: "https://kept.example.com/path",
        }),
      }),
    );
    expect(res.status).toBe(200);

    const [latest] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.submitterVendorId, vendorId))
      .orderBy(desc(submissions.submittedAt))
      .limit(1);
    const payload = latest.payload as { url: string };
    expect(payload.url).toBe("https://kept.example.com/path");
  });
});

describe("POST /api/submissions — query result fingerprint", () => {
  it("payload preserves stages + capabilities + custom proposals", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    const vendorId = await seedVendor("test-payload");
    await seedMember({ clerkUserId: "user_payload", vendorId });
    authMock.userId = "user_payload";

    await POST(
      makeRequest({
        ...validCompany(),
        ...validProduct({
          stages: ["delivery", "operations"],
          capabilities: ["risk-management"],
          customCapabilities: ["AI-assisted forecasting"],
          customIndustries: ["Aerospace"],
          pricing: "__custom__",
          customPricing: "Outcome-based",
        }),
      }),
    );

    const [latest] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.submitterVendorId, vendorId))
      .orderBy(desc(submissions.submittedAt))
      .limit(1);
    const payload = latest.payload as {
      stages: string[];
      capabilities: string[];
      customCapabilities: string[];
      customIndustries: string[];
      pricing: string;
      customPricing: string | null;
    };
    expect(payload.stages).toEqual(["delivery", "operations"]);
    expect(payload.capabilities).toEqual(["risk-management"]);
    expect(payload.customCapabilities).toEqual(["AI-assisted forecasting"]);
    expect(payload.customIndustries).toEqual(["Aerospace"]);
    expect(payload.pricing).toBe("__custom__");
    expect(payload.customPricing).toBe("Outcome-based");
  });
});
