import { describe, it, expect, vi, beforeEach } from "vitest";
import { Webhook } from "svix";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { vendorMembers } from "@/lib/db/schema";

/**
 * Phase A.1 webhook tests focused on is_admin behaviour.
 *
 * Why a separate file: the legacy tests/webhook.test.ts asserts
 * against the pre-B.1 schema (vendors.clerk_user_id, since dropped)
 * and is tracked as pre-existing tech debt in CLAUDE.md §14. These
 * cases assert the new contract without inheriting that breakage.
 */

const mockUpdateUserMetadata = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: () =>
    Promise.resolve({
      users: { updateUserMetadata: mockUpdateUserMetadata },
    }),
}));

// Mock the allowlist predicate directly — easier than mocking env
// inside the lazy-loaded clerk() schema. The webhook handler calls
// isAdminEmail() which we override here per-test.
const allowlistMock = vi.hoisted(() => ({
  isAdminEmail: vi.fn((email: string | null | undefined) => false),
}));
vi.mock("@/lib/auth/admin-allowlist", () => allowlistMock);

import { POST } from "@/app/api/webhooks/clerk/route";

const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET!;
const wh = new Webhook(SIGNING_SECRET);

function signedRequest(payload: unknown): Request {
  const body = JSON.stringify(payload);
  const id = `msg_test_${Math.random().toString(36).slice(2, 10)}`;
  const ts = new Date();
  const tsSec = Math.floor(ts.getTime() / 1000).toString();
  const signature = wh.sign(id, ts, body);
  return new Request("http://localhost/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": id,
      "svix-timestamp": tsSec,
      "svix-signature": signature,
    },
    body,
  });
}

function userCreatedPayload(opts: {
  id: string;
  email: string;
  verified?: boolean;
  imageUrl?: string | null;
}) {
  return {
    type: "user.created",
    data: {
      id: opts.id,
      first_name: "Test",
      last_name: "User",
      image_url: opts.imageUrl ?? null,
      email_addresses: [
        {
          id: "ea_1",
          email_address: opts.email,
          verification: {
            status: opts.verified === false ? "unverified" : "verified",
          },
        },
      ],
      primary_email_address_id: "ea_1",
      external_accounts: [{ provider: "oauth_linkedin_oidc" }],
      public_metadata: {},
    },
  };
}

function userUpdatedPayload(opts: {
  id: string;
  email: string;
  verified?: boolean;
  imageUrl?: string | null;
}) {
  const created = userCreatedPayload(opts);
  return { ...created, type: "user.updated" };
}

beforeEach(() => {
  mockUpdateUserMetadata.mockReset();
  mockUpdateUserMetadata.mockResolvedValue({});
  allowlistMock.isAdminEmail.mockReset();
});

describe("clerk webhook — is_admin (Phase A.1)", () => {
  it("user.created with allowlisted verified email → is_admin=true", async () => {
    allowlistMock.isAdminEmail.mockReturnValue(true);
    const res = await POST(
      signedRequest(
        userCreatedPayload({ id: "user_ph_a1_a", email: "boss@x.com" }),
      ),
    );
    expect(res.status).toBe(200);
    const [row] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.clerkUserId, "user_ph_a1_a"))
      .limit(1);
    expect(row?.isAdmin).toBe(true);
    expect(row?.primaryEmail).toBe("boss@x.com");
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith("user_ph_a1_a", {
      publicMetadata: { is_admin: true },
    });
  });

  it("user.created with non-allowlisted email → is_admin=false", async () => {
    allowlistMock.isAdminEmail.mockReturnValue(false);
    const res = await POST(
      signedRequest(
        userCreatedPayload({
          id: "user_ph_a1_b",
          email: "rando@notlisted.com",
        }),
      ),
    );
    expect(res.status).toBe(200);
    const [row] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.clerkUserId, "user_ph_a1_b"))
      .limit(1);
    expect(row?.isAdmin).toBe(false);
  });

  it("user.created with allowlisted UNVERIFIED email → is_admin=false (security boundary)", async () => {
    // The allowlist mock would return true if called — but the
    // webhook only passes *verified* emails to the predicate, so
    // it should be called with null (not the email).
    allowlistMock.isAdminEmail.mockReturnValue(true);
    const res = await POST(
      signedRequest(
        userCreatedPayload({
          id: "user_ph_a1_c",
          email: "boss@x.com",
          verified: false,
        }),
      ),
    );
    expect(res.status).toBe(200);
    const [row] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.clerkUserId, "user_ph_a1_c"))
      .limit(1);
    // Webhook handed null to the predicate (unverified primary), so
    // the mock's truthy return is moot — is_admin stays false.
    expect(row?.isAdmin).toBe(false);
    expect(allowlistMock.isAdminEmail).toHaveBeenCalledWith(null);
  });

  it("user.updated promotes false → true when email enters allowlist", async () => {
    // Seed with is_admin=false.
    allowlistMock.isAdminEmail.mockReturnValueOnce(false);
    await POST(
      signedRequest(
        userCreatedPayload({ id: "user_ph_a1_d", email: "old@x.com" }),
      ),
    );

    // Now the user's email matches.
    allowlistMock.isAdminEmail.mockReturnValueOnce(true);
    await POST(
      signedRequest(
        userUpdatedPayload({ id: "user_ph_a1_d", email: "new@x.com" }),
      ),
    );

    const [row] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.clerkUserId, "user_ph_a1_d"))
      .limit(1);
    expect(row?.isAdmin).toBe(true);
    expect(row?.primaryEmail).toBe("new@x.com");
  });

  // V.2 — avatar_url is mirrored straight from Clerk's image_url
  // payload field. NULL when missing; updated on every user.updated
  // event (Clerk re-synthesises image_url on profile changes).

  it("user.created writes avatar_url from image_url when present", async () => {
    allowlistMock.isAdminEmail.mockReturnValue(false);
    const res = await POST(
      signedRequest(
        userCreatedPayload({
          id: "user_v2_avatar_a",
          email: "withavatar@x.com",
          imageUrl: "https://img.clerk.com/avatar_a.jpg",
        }),
      ),
    );
    expect(res.status).toBe(200);
    const [row] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.clerkUserId, "user_v2_avatar_a"))
      .limit(1);
    expect(row?.avatarUrl).toBe("https://img.clerk.com/avatar_a.jpg");
  });

  it("user.created writes NULL avatar_url when image_url is missing", async () => {
    allowlistMock.isAdminEmail.mockReturnValue(false);
    const res = await POST(
      signedRequest(
        userCreatedPayload({
          id: "user_v2_avatar_b",
          email: "noavatar@x.com",
          imageUrl: null,
        }),
      ),
    );
    expect(res.status).toBe(200);
    const [row] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.clerkUserId, "user_v2_avatar_b"))
      .limit(1);
    expect(row?.avatarUrl).toBeNull();
  });

  it("user.updated refreshes avatar_url on every event", async () => {
    allowlistMock.isAdminEmail.mockReturnValue(false);
    await POST(
      signedRequest(
        userCreatedPayload({
          id: "user_v2_avatar_c",
          email: "rotate@x.com",
          imageUrl: "https://img.clerk.com/avatar_v1.jpg",
        }),
      ),
    );
    await POST(
      signedRequest(
        userUpdatedPayload({
          id: "user_v2_avatar_c",
          email: "rotate@x.com",
          imageUrl: "https://img.clerk.com/avatar_v2.jpg",
        }),
      ),
    );
    const [row] = await db
      .select()
      .from(vendorMembers)
      .where(eq(vendorMembers.clerkUserId, "user_v2_avatar_c"))
      .limit(1);
    expect(row?.avatarUrl).toBe("https://img.clerk.com/avatar_v2.jpg");
  });

  it("user.updated does NOT demote true → false (promote-only, preserves manual UPDATEs)", async () => {
    // Manually flip is_admin=true (simulates an operator running the
    // runbook UPDATE for an admin whose email isn't in the allowlist).
    const { id } = (
      await db
        .insert(vendorMembers)
        .values({
          vendorId: null,
          clerkUserId: "user_ph_a1_e",
          name: "Manual Admin",
          primaryEmail: "manual@admin.io",
          onboarded: false,
          isAdmin: true,
        })
        .returning({ id: vendorMembers.id })
    )[0];

    // Clerk fires user.updated for some reason; their email is NOT
    // in the allowlist — the webhook must not demote them.
    allowlistMock.isAdminEmail.mockReturnValueOnce(false);
    const res = await POST(
      signedRequest(
        userUpdatedPayload({
          id: "user_ph_a1_e",
          email: "manual@admin.io",
        }),
      ),
    );
    expect(res.status).toBe(200);

    const [row] = await db
      .select({ isAdmin: vendorMembers.isAdmin })
      .from(vendorMembers)
      .where(eq(vendorMembers.id, id))
      .limit(1);
    expect(row?.isAdmin).toBe(true);
  });
});
