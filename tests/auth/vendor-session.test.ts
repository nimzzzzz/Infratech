import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/lib/db/client";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Three module-boundary mocks:
 *
 *  - @/lib/env  : DEMO_MODE flips per-test. .env.local sets it true,
 *                 but real-Clerk-path cases need it false.
 *  - @clerk/nextjs/server : auth() returns { userId } we control.
 *  - next/navigation : redirect() is normally a "throw on render" sentinel
 *                      from Next; we throw a tagged RedirectError instead
 *                      so tests can assert the destination.
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
  // Mutable per-test. Defaults to null = "Clerk user not found / API
  // unreachable" so the lazy-create branch returns null in cases that
  // don't exercise it explicitly.
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

async function createTestVendor(opts: {
  clerkUserId: string;
  onboarded: boolean;
  suspended?: boolean;
}) {
  const slug = `tv-${Math.random().toString(36).slice(2, 10)}`;
  const [row] = await db
    .insert(vendors)
    .values({
      slug,
      name: "Test Vendor",
      clerkUserId: opts.clerkUserId,
      contactEmail: `${slug}@example.com`,
      onboarded: opts.onboarded,
      suspended: opts.suspended ?? false,
    })
    .returning();
  return row;
}

describe("getVendorSession — real Clerk path", () => {
  it("resolves the Clerk userId to its vendor row + populates user fields", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const v = await createTestVendor({
      clerkUserId: "user_real_1",
      onboarded: true,
    });
    authMock.userId = "user_real_1";

    const session = await getVendorSession();
    expect(session.vendor.id).toBe(v.id);
    expect(session.vendor.clerkUserId).toBe("user_real_1");
    expect(session.user.id).toBe("user_real_1");
    expect(session.user.name).toBe(v.name);
    expect(session.user.email).toBe(v.contactEmail);
  });

  it("redirects to /login when no Clerk userId is present", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    authMock.userId = null;
    await expect(getVendorSession()).rejects.toThrow(/REDIRECT:\/login$/);
  });

  it("redirects to /login?error=no_vendor when userId has no matching vendor row AND lazy-create fallback fails (Clerk API unreachable)", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    authMock.userId = "user_orphan_xyz";
    // clerkUserMock.user stays null, so the helper's clerkClient call
    // throws and lazyCreateVendorFromClerk returns null.
    await expect(getVendorSession()).rejects.toThrow(
      /REDIRECT:\/login\?error=no_vendor/,
    );
  });

  it("lazy-creates a vendor row when the Clerk session exists but the webhook never delivered", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const userId = "user_3DLateWebhook42AbCdEf";
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

    // TODO(stage-4 commit 6): rewrite for the vendor_members shape.
    // After the schema split, lazy-create produces a vendor_members
    // row only — vendor stays null. These assertions are the OLD
    // shape and will be replaced in the test-rewrite commit.
    expect(session.vendor!.clerkUserId).toBe(userId);
    expect(session.vendor!.name).toBe("Aiko Tanaka");
    expect(session.vendor!.contactEmail).toBe("aiko@example.com");
    expect(session.vendor!.onboarded).toBe(false);
    expect(session.vendor!.slug).toMatch(/^aiko-tanaka-[A-Za-z0-9]{6}$/);

    const second = await getVendorSession({ requireOnboarded: false });
    expect(second.vendor!.id).toBe(session.vendor!.id);
  });

  it("redirects to /login?error=suspended for a suspended vendor", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    await createTestVendor({
      clerkUserId: "user_suspended_2",
      onboarded: true,
      suspended: true,
    });
    authMock.userId = "user_suspended_2";
    await expect(getVendorSession()).rejects.toThrow(
      /REDIRECT:\/login\?error=suspended/,
    );
  });
});

describe("getVendorSession — onboarded gate", () => {
  it("redirects an unonboarded vendor to /dashboard/onboarding (default requireOnboarded=true)", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    await createTestVendor({
      clerkUserId: "user_pre_onboard_3",
      onboarded: false,
    });
    authMock.userId = "user_pre_onboard_3";
    await expect(getVendorSession()).rejects.toThrow(
      /REDIRECT:\/dashboard\/onboarding/,
    );
  });

  it("returns the session when requireOnboarded=false even if vendor.onboarded=false (the onboarding pages themselves)", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const v = await createTestVendor({
      clerkUserId: "user_onboard_page_4",
      onboarded: false,
    });
    authMock.userId = "user_onboard_page_4";

    const session = await getVendorSession({ requireOnboarded: false });
    expect(session.vendor!.id).toBe(v.id);
    expect(session.vendor!.onboarded).toBe(false);
  });

  it("does not redirect when vendor.onboarded=true under default settings", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const v = await createTestVendor({
      clerkUserId: "user_onboarded_5",
      onboarded: true,
    });
    authMock.userId = "user_onboarded_5";

    const session = await getVendorSession();
    expect(session.vendor.id).toBe(v.id);
  });
});

describe("getVendorSession — DEMO_MODE bypass", () => {
  beforeEach(() => {
    envMock.DEMO_MODE = true;
    authMock.userId = null; // demo path doesn't even consult Clerk
  });

  it('demoOverride="returning" returns the first onboarded vendor (Oracle in seed)', async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const session = await getVendorSession({ demoOverride: "returning" });
    expect(session.vendor.onboarded).toBe(true);
  });

  it('demoOverride="new" returns the first non-onboarded vendor (requires opting out of the onboarded gate, since "new" implies pre-onboarding)', async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    const session = await getVendorSession({
      demoOverride: "new",
      requireOnboarded: false,
    });
    // After B.1 the demoOverride="new" branch returns vendor=null
    // (synthetic pre-onboarded member with vendorId=null). Commit 6
    // replaces this assertion accordingly.
    expect(session.vendor).toBeNull();
  });

  it("DEMO_MODE still applies the onboarded gate by default — redirects an unonboarded demo vendor", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    await expect(
      getVendorSession({ demoOverride: "new" /* default requireOnboarded=true */ }),
    ).rejects.toThrow(/REDIRECT:\/dashboard\/onboarding/);
  });

  it("DEMO_MODE redirects to /login?error=no_demo_vendor when no seeded vendor matches the override", async () => {
    const { getVendorSession } = await import("@/lib/auth/session");
    // Wipe every onboarded vendor inside the test tx so the demoOverride
    // can't find one. (Suspended / unonboarded rows aren't enough — the
    // demo-mode lookup filters on onboarded.)
    await db
      .update(vendors)
      .set({ onboarded: false })
      .where(eq(vendors.onboarded, true));

    await expect(
      getVendorSession({ demoOverride: "returning" }),
    ).rejects.toThrow(/REDIRECT:\/login\?error=no_demo_vendor/);
  });
});
