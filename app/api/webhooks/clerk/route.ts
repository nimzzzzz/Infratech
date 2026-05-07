import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import {
  vendors,
  vendorMembers,
  admins,
  auditLog,
  apps,
} from "@/lib/db/schema";

/**
 * Clerk webhook handler.
 *
 * Endpoint: POST /api/webhooks/clerk
 *
 * Configure this URL in the Clerk dashboard → Webhooks. Subscribe to
 * `user.created`, `user.updated`, `user.deleted`. The signing secret
 * lives in CLERK_WEBHOOK_SIGNING_SECRET.
 *
 * Architecture: the DB row is the source of truth. Clerk's
 * publicMetadata.role is a best-effort cache of that source of truth so
 * the JWT claim avoids a DB lookup on the hot path. Failures of the
 * Clerk API never block DB writes — they're logged and breadcrumbed
 * to audit_log so a future job can retry.
 *
 *   • user.created
 *       1. Determine canonical role: explicit publicMetadata.role="admin"
 *          → admin; everything else (LinkedIn OAuth, email, missing) →
 *          vendor.
 *       2. Insert the DB row first. Vendors are stored in vendor_members
 *          (vendor_id NULL until /dashboard/onboarding); admins in admins.
 *       3. Best-effort: push role back to Clerk publicMetadata if it
 *          differs from canonical. Failure logs + breadcrumbs, doesn't
 *          throw.
 *   • user.updated — sync name/email on the existing vendor_members or
 *     admins row; reconcile role drift the same way. If no DB row
 *     exists, fall through to handleUserCreated.
 *   • user.deleted — vendor_members PII anonymised + clerk_user_id
 *     cleared + suspended=true; if the member was the only one
 *     pointing at their vendor, the vendor row is suspended too;
 *     their published apps move to "unpublished". Admins hard-
 *     deleted. Either path writes an audit_log row with admin_id=NULL.
 *     The vendor row itself is never deleted — the company exists
 *     independently of the human's link to it.
 */

type ClerkUser = {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
  }>;
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  external_accounts: Array<{
    provider: string;
  }>;
  public_metadata: { role?: "vendor" | "admin" } & Record<string, unknown>;
};

type ClerkDeletedUser = {
  id: string;
  deleted: boolean;
};

type ClerkEvent =
  | { type: "user.created"; data: ClerkUser }
  | { type: "user.updated"; data: ClerkUser }
  | { type: "user.deleted"; data: ClerkDeletedUser };

type CanonicalRole = "vendor" | "admin";

function fullNameOf(u: ClerkUser): string {
  const parts = [u.first_name, u.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unnamed vendor";
}

function primaryEmailOf(u: ClerkUser): string | null {
  const primary = u.email_addresses.find(
    (e) => e.id === u.primary_email_address_id,
  );
  return primary?.email_address ?? u.email_addresses[0]?.email_address ?? null;
}

function canonicalRoleOf(user: ClerkUser): CanonicalRole {
  // Admin is opt-in via invitation metadata. Everything else (LinkedIn,
  // email, missing) defaults to vendor.
  return user.public_metadata?.role === "admin" ? "admin" : "vendor";
}

/**
 * Best-effort push of the canonical role back to Clerk publicMetadata.
 * Logs and breadcrumbs on failure — never throws.
 */
async function syncRoleToClerk(
  userId: string,
  role: CanonicalRole,
  existingMeta: Record<string, unknown> | undefined,
): Promise<void> {
  try {
    const cc = await clerkClient();
    await cc.users.updateUserMetadata(userId, {
      publicMetadata: { ...(existingMeta ?? {}), role },
    });
    console.info(
      `[clerk webhook] synced role=${role} to Clerk metadata for user ${userId}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[clerk webhook] failed to sync role=${role} to Clerk metadata for user ${userId}: ${message}`,
    );
    // Breadcrumb so an out-of-band retry job can find these later. Best-effort
    // even on this insert — the audit log is nice-to-have, never load-bearing.
    try {
      await db.insert(auditLog).values({
        adminId: null,
        action: "clerk.metadata_sync_failed",
        targetType: role,
        targetId: userId,
        before: { intendedRole: role },
        after: { error: message },
      });
    } catch (auditErr) {
      console.error(
        `[clerk webhook] failed to write metadata-sync breadcrumb`,
        auditErr,
      );
    }
  }
}

async function verifyAndParse(req: Request): Promise<ClerkEvent> {
  const { webhookSigningSecret } = env.clerk();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("Missing svix headers");
  }

  const body = await req.text();
  const wh = new Webhook(webhookSigningSecret);
  const evt = wh.verify(body, {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  }) as ClerkEvent;

  return evt;
}

export async function POST(req: Request) {
  let event: ClerkEvent;
  try {
    event = await verifyAndParse(req);
  } catch (err) {
    console.error("[clerk webhook] verification failed", err);
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    if (event.type === "user.created") await handleUserCreated(event.data);
    else if (event.type === "user.updated") await handleUserUpdated(event.data);
    else if (event.type === "user.deleted") await handleUserDeleted(event.data);
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[clerk webhook] handler error", err);
    return new Response("Internal error", { status: 500 });
  }
}

async function handleUserCreated(user: ClerkUser): Promise<void> {
  const role = canonicalRoleOf(user);

  // 1. DB insert first — source of truth.
  if (role === "admin") {
    const email = primaryEmailOf(user) ?? `${user.id}@unknown.example`;
    await db
      .insert(admins)
      .values({
        clerkUserId: user.id,
        name: fullNameOf(user),
        email,
        role: "admin",
      })
      .onConflictDoNothing({ target: admins.clerkUserId });
  } else {
    const name = fullNameOf(user);
    const email = primaryEmailOf(user) ?? `${user.id}@unknown.example`;
    // vendor_id stays NULL — the human hasn't confirmed their company
    // yet. /dashboard/onboarding inserts a vendors row and repoints.
    await db
      .insert(vendorMembers)
      .values({
        vendorId: null,
        clerkUserId: user.id,
        name,
        primaryEmail: email,
        onboarded: false,
      })
      .onConflictDoNothing({ target: vendorMembers.clerkUserId });
  }

  // 2. Best-effort: ensure Clerk metadata reflects canonical role.
  if (user.public_metadata?.role !== role) {
    await syncRoleToClerk(user.id, role, user.public_metadata);
  }
}

async function handleUserUpdated(user: ClerkUser): Promise<void> {
  const name = fullNameOf(user);
  const email = primaryEmailOf(user);

  // Find the existing record. Admin first — admin and vendor_member
  // never collide on clerk_user_id, but admin is the smaller table.
  const [adminRow] = await db
    .select()
    .from(admins)
    .where(eq(admins.clerkUserId, user.id))
    .limit(1);

  if (adminRow) {
    if (email) {
      await db
        .update(admins)
        .set({ name, email })
        .where(eq(admins.id, adminRow.id));
    }
    if (user.public_metadata?.role !== "admin") {
      await syncRoleToClerk(user.id, "admin", user.public_metadata);
    }
    return;
  }

  const [memberRow] = await db
    .select()
    .from(vendorMembers)
    .where(eq(vendorMembers.clerkUserId, user.id))
    .limit(1);

  if (memberRow) {
    // primary_email is NOT NULL — only update if Clerk gave us one.
    const patch: { name: string; primaryEmail?: string } = { name };
    if (email) patch.primaryEmail = email;
    await db
      .update(vendorMembers)
      .set(patch)
      .where(eq(vendorMembers.id, memberRow.id));
    if (user.public_metadata?.role !== "vendor") {
      await syncRoleToClerk(user.id, "vendor", user.public_metadata);
    }
    return;
  }

  // No DB row — defensive: an update for a user we've never seen.
  // Treat as a created event.
  console.warn(
    `[clerk webhook] user.updated for ${user.id} but no DB row exists; treating as created`,
  );
  await handleUserCreated(user);
}

async function handleUserDeleted(user: ClerkDeletedUser): Promise<void> {
  // Try admin first — admins hard-delete.
  const [adminRow] = await db
    .select()
    .from(admins)
    .where(eq(admins.clerkUserId, user.id))
    .limit(1);

  if (adminRow) {
    await db.transaction(async (tx) => {
      await tx.insert(auditLog).values({
        adminId: null,
        action: "admin.gdpr_delete",
        targetType: "admin",
        targetId: String(adminRow.id),
        before: adminRow,
        after: null,
      });
      await tx.delete(admins).where(eq(admins.id, adminRow.id));
    });
    return;
  }

  const [memberRow] = await db
    .select()
    .from(vendorMembers)
    .where(eq(vendorMembers.clerkUserId, user.id))
    .limit(1);

  if (!memberRow) return;

  await db.transaction(async (tx) => {
    await tx.insert(auditLog).values({
      adminId: null,
      action: "vendor_member.gdpr_delete",
      targetType: "vendor_member",
      targetId: String(memberRow.id),
      before: memberRow,
      after: null,
    });

    // Anonymise the member row. Don't delete — audit_log references
    // the id; cascading delete would clobber that breadcrumb.
    await tx
      .update(vendorMembers)
      .set({
        name: "[deleted user]",
        primaryEmail: `deleted-${memberRow.id}@unknown.example`,
        linkedinUrl: null,
        clerkUserId: `deleted-${memberRow.id}`,
        suspended: true,
      })
      .where(eq(vendorMembers.id, memberRow.id));

    // The vendor row itself stays — the company exists independently
    // of this human's link to it. But if this human was the ONLY
    // active member of that vendor, suspend the vendor and unpublish
    // its apps (no one's left to maintain it).
    if (memberRow.vendorId !== null) {
      const [{ remaining }] = await tx
        .select({ remaining: sql<number>`count(*)::int` })
        .from(vendorMembers)
        .where(
          and(
            eq(vendorMembers.vendorId, memberRow.vendorId),
            ne(vendorMembers.suspended, true),
            isNotNull(vendorMembers.clerkUserId),
          ),
        );
      // The just-anonymised row above set suspended=true so it's
      // already excluded by the `ne(suspended, true)` clause. If the
      // count is zero, this human was the sole active member.
      if (remaining === 0) {
        await tx
          .update(vendors)
          .set({ suspended: true })
          .where(eq(vendors.id, memberRow.vendorId));
        await tx
          .update(apps)
          .set({ status: "unpublished" })
          .where(eq(apps.vendorId, memberRow.vendorId));
      }
    }
  });
}
