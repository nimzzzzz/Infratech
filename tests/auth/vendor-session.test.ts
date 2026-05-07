import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db/client";
import { vendors, vendorMembers, apps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Three module-boundary mocks:
 *
 *  - @/lib/env  : DEMO_MODE flips per-test. .env.local sets it true,
 *                 but real-Clerk-path cases need it false.
 *  - @clerk/nextjs/server : auth() returns { userId } we control,
 *                            clerkClient.users.getUser returns the
 *                            user from clerkUserMock.user.
 *  - next/navigation : redirect() throws a tagged RedirectError so
 *                       tests can assert the destination.
 */
const envMock = vi.hoisted(() => ({
  DEMO_MODE: false,
  IS_PROD: false,
  SITE_URL: "http://localhost:3000",
  SEARCH_FUZZY: false,
  database: () => ({ DATABASE_URL: "x", DATABASE_URL_UNPOOLED: "x" }),
  clerk: () => ({
    publishableKey: "x",
    secretKey: "x",
    webhookSigningSecret: "x",
  }),
  resend: () => ({
    RESEND_API_KEY: "x",
    EMAIL_FROM: "x@example.com",
    EMAIL_CONTACT_INBOX: "x@example.com",
  }),
  r2: () => ({
    R2_ACCOUNT_ID: "x",
    R2_ACCESS_KEY_ID: "x",
    R2_SECRET_ACCESS_KEY: "x",
    R2_BUCKET_NAME: "x",
    R2_PUBLIC_URL: "https://x",
  }),
  sentry: () => ({}),
  secrets: () => ({}),
  plausible: () => ({}),
}));
vi.mock("@/lib/env", () => ({ env: envMock }));

const authMock = vi.hoisted(() => ({ userId: null as string | null }));
const clerkUserMock = vi.hoisted(() => ({
  user: null as null | {
    id: string;
    firstName: string | null;
    lastName: string | null;
    primaryEmailAddressId: string | null;
    emailAddresses: Array<{ id: string; emailAddress: string }>;
  },
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: authMock.userId })),
  clerkClient: vi.fn(async () => ({
    users: {
      getUser: vi.fn(async (id: string) => {
        if (clerkUserMock.user && clerkUserMock.user.id === id) {
          return clerkUserMock.user;
        }
        throw new Error(`Clerk user ${id} not found (mock)`);
      }),
    },
  })),
}));

class RedirectError extends Error {
  constructor(public to: string) {
    super(`REDIRECT:${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));

beforeEach(() => {
  envMock.DEMO_MODE = false;
  authMock.userId = null;
  clerkUserMock.user = null;
});

// ── Test fixture helpers ────────────────────────────────────────────

async function insertTestVendor(name = "Test Vendor") {
  const slug = `tv-${Math.random().toString(36).slice(2, 10)}`;
  const [row] = await db
    .insert(vendors)
    .values({
      slug,
      name,
      contactEmail: `${slug}@example.com`,
    })
    .returning();
  return row;
}

async function insertTestMember(opts: {
  clerkUserId: string;
  vendorId: number | null;
  onboarded: boolean;
  suspended?: boolean;
  name?: string;
  email?: string;
  role?: string | null;
}) {
  const [row] = await db
    .insert(vendorMembers)
    .values({
      vendorId: opts.vendorId,
      clerkUserId: opts.clerkUserId,
      name: opts.name ?? "Test Person",
      primaryEmail: opts.email ?? `${opts.clerkUserId}@example.com`,
      onboarded: opts.onboarded,
      suspended: opts.suspended ?? false,
      role: opts.role ?? null,
    })
    .returning();
  return row;
}

// ── Real Clerk path ─────────────────────────────────────────────────

describe("getVendorSession — onboarded vendor (vendor_id populated)", () => {
  it("returns the full session with both vendor + vendorMember non-null", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const v = await insertTestVendor("Aiko Co");
    await insertTestMember({
      clerkUserId: "user_real_1",
      vendorId: v.id,
      onboarded: true,
      name: "Aiko Tanaka",
      email: "aiko@example.com",
      role: "CTO",
    });
    authMock.userId = "user_real_1";

    const session = await getVendorSession();

    expect(session.vendor.id).toBe(v.id);
    expect(session.vendor.name).toBe("Aiko Co");
    expect(session.vendorMember.clerkUserId).toBe("user_real_1");
    expect(session.vendorMember.name).toBe("Aiko Tanaka");
    expect(session.vendorMember.role).toBe("CTO");
    expect(session.vendorMember.onboarded).toBe(true);
    expect(session.user.id).toBe("user_real_1");
    expect(session.user.name).toBe("Aiko Tanaka");
    expect(session.user.email).toBe("aiko@example.com");
  });
});

describe("getVendorSession — pre-onboarding vendor_member (vendor_id NULL)", () => {
  it("redirects an unonboarded member with no vendor to /dashboard/onboarding under the default gate", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    await insertTestMember({
      clerkUserId: "user_pre_1",
      vendorId: null,
      onboarded: false,
    });
    authMock.userId = "user_pre_1";

    await expect(getVendorSession()).rejects.toThrow(
      /REDIRECT:\/dashboard\/onboarding/,
    );
  });

  it("returns the open shape (vendor=null) when called with requireOnboarded:false — the onboarding pages themselves", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const m = await insertTestMember({
      clerkUserId: "user_pre_2",
      vendorId: null,
      onboarded: false,
      name: "Hannah Pre",
      email: "hannah@example.com",
    });
    authMock.userId = "user_pre_2";

    const session = await getVendorSession({ requireOnboarded: false });

    expect(session.vendor).toBeNull();
    expect(session.vendorMember.id).toBe(m.id);
    expect(session.vendorMember.vendorId).toBeNull();
    expect(session.vendorMember.onboarded).toBe(false);
    expect(session.user.name).toBe("Hannah Pre");
  });

  it("redirects an onboarded member whose vendor_id is somehow NULL (corrupted state) back to /dashboard/onboarding when the gate is on", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    // Defensive contract: gate=on implies vendor exists. If it
    // doesn't, send the human back through onboarding rather than
    // handing them a null vendor.
    await insertTestMember({
      clerkUserId: "user_corrupt_1",
      vendorId: null,
      onboarded: true,
    });
    authMock.userId = "user_corrupt_1";

    await expect(getVendorSession()).rejects.toThrow(
      /REDIRECT:\/dashboard\/onboarding/,
    );
  });
});

describe("getVendorSession — error paths", () => {
  it("redirects to /login when no Clerk userId is present", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    authMock.userId = null;
    await expect(getVendorSession()).rejects.toThrow(/REDIRECT:\/login$/);
  });

  it("redirects to /login?error=no_vendor when userId has no member row AND lazy-create fails", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    authMock.userId = "user_orphan_x";
    // clerkUserMock.user stays null → helper's clerkClient call
    // throws → lazyCreate returns null → redirect.
    await expect(getVendorSession()).rejects.toThrow(
      /REDIRECT:\/login\?error=no_vendor/,
    );
  });

  it("redirects to /login?error=suspended for a suspended vendor_member", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const v = await insertTestVendor();
    await insertTestMember({
      clerkUserId: "user_susp_1",
      vendorId: v.id,
      onboarded: true,
      suspended: true,
    });
    authMock.userId = "user_susp_1";
    await expect(getVendorSession()).rejects.toThrow(
      /REDIRECT:\/login\?error=suspended/,
    );
  });
});

// ── Lazy-create fallback ────────────────────────────────────────────

describe("getVendorSession — lazy-create vendor_members fallback", () => {
  it("creates a vendor_members row from Clerk user data when the webhook didn't deliver", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const userId = "user_3DLazyCreatedAaaaBb";
    authMock.userId = userId;
    clerkUserMock.user = {
      id: userId,
      firstName: "Aiko",
      lastName: "Tanaka",
      primaryEmailAddressId: "idn_primary",
      emailAddresses: [
        { id: "idn_primary", emailAddress: "aiko@example.com" },
      ],
    };

    const session = await getVendorSession({ requireOnboarded: false });

    // vendor stays null — lazy-create only writes to vendor_members.
    // The /dashboard/onboarding flow is what creates a vendor row.
    expect(session.vendor).toBeNull();
    expect(session.vendorMember.clerkUserId).toBe(userId);
    expect(session.vendorMember.name).toBe("Aiko Tanaka");
    expect(session.vendorMember.primaryEmail).toBe("aiko@example.com");
    expect(session.vendorMember.onboarded).toBe(false);
    expect(session.vendorMember.vendorId).toBeNull();

    // Persisted: a follow-up call returns the same member without
    // re-running lazy-create.
    const second = await getVendorSession({ requireOnboarded: false });
    expect(second.vendorMember.id).toBe(session.vendorMember.id);
  });

  it("falls back to ${userId}@unknown.example when Clerk user has no email", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const userId = "user_3DNoEmail112233";
    authMock.userId = userId;
    clerkUserMock.user = {
      id: userId,
      firstName: "Email",
      lastName: "Missing",
      primaryEmailAddressId: null,
      emailAddresses: [], // Clerk has no email — rare for LinkedIn but possible
    };

    const session = await getVendorSession({ requireOnboarded: false });
    expect(session.vendorMember.primaryEmail).toBe(`${userId}@unknown.example`);
  });
});

// ── DEMO_MODE bypass ────────────────────────────────────────────────

describe("getVendorSession — DEMO_MODE bypass", () => {
  beforeEach(() => {
    envMock.DEMO_MODE = true;
    authMock.userId = null;
  });

  it('demoOverride="returning" returns a session with vendor + vendorMember populated (synthesised when no real member exists)', async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    // Seed has no vendor_members rows → falls back to first vendor
    // row + synthetic member with onboarded=true.
    const session = await getVendorSession({ demoOverride: "returning" });
    expect(session.vendor).not.toBeNull();
    expect(session.vendorMember.onboarded).toBe(true);
  });

  it('demoOverride="returning" prefers a real onboarded vendor_member if one exists', async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const v = await insertTestVendor("Real Demo Co");
    await insertTestMember({
      clerkUserId: "user_demo_real",
      vendorId: v.id,
      onboarded: true,
      name: "Real Demo Person",
    });
    const session = await getVendorSession({ demoOverride: "returning" });
    expect(session.vendor!.id).toBe(v.id);
    expect(session.vendorMember.name).toBe("Real Demo Person");
  });

  it('demoOverride="new" returns vendor=null with a synthetic unonboarded member when called with requireOnboarded:false', async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const session = await getVendorSession({
      demoOverride: "new",
      requireOnboarded: false,
    });
    expect(session.vendor).toBeNull();
    expect(session.vendorMember.onboarded).toBe(false);
    expect(session.vendorMember.vendorId).toBeNull();
  });

  it('demoOverride="new" with the default onboarded gate redirects to /dashboard/onboarding', async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    await expect(
      getVendorSession({ demoOverride: "new" }),
    ).rejects.toThrow(/REDIRECT:\/dashboard\/onboarding/);
  });

  it("DEMO_MODE redirects to /login?error=no_demo_vendor when no seeded vendor exists at all", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    // Wipe vendors. Apps reference vendors via FK; clear them
    // first so the delete cascades cleanly within the test tx.
    await db.delete(apps);
    await db.delete(vendorMembers);
    await db.delete(vendors);

    await expect(
      getVendorSession({ demoOverride: "returning" }),
    ).rejects.toThrow(/REDIRECT:\/login\?error=no_demo_vendor/);
  });
});

// Quiet the lint about importing eq even though we don't use it directly
// in this file anymore.
void eq;
