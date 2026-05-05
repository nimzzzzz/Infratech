import { headers } from "next/headers";
import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import { vendors, admins, auditLog, apps } from "@/lib/db/schema";

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
 *       2. Insert the DB row first.
 *       3. Best-effort: push role back to Clerk publicMetadata if it
 *          differs from canonical. Failure logs + breadcrumbs, doesn't
 *          throw.
 *   • user.updated — sync name/email; reconcile role drift the same way.
 *     If no DB row exists, fall through to handleUserCreated.
 *   • user.deleted — vendors anonymised + their published apps moved to
 *     "unpublished"; admins hard-deleted. Either path writes an
 *     audit_log row with admin_id=NULL.
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

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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
  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");

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
    const email = primaryEmailOf(user);
    await db
      .insert(vendors)
      .values({
        slug: `${slugify(name)}-${user.id.slice(-6)}`,
        clerkUserId: user.id,
        name,
        contactEmail: email,
        onboarded: false,
      })
      .onConflictDoNothing({ target: vendors.clerkUserId });
  }

  // 2. Best-effort: ensure Clerk metadata reflects canonical role.
  if (user.public_metadata?.role !== role) {
    await syncRoleToClerk(user.id, role, user.public_metadata);
  }
}

async function handleUserUpdated(user: ClerkUser): Promise<void> {
  const name = fullNameOf(user);
  const email = primaryEmailOf(user);

  // Find the existing record. Admin first — admin/vendor never collide on
  // clerk_user_id, but admin is the smaller table.
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

  const [vendorRow] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.clerkUserId, user.id))
    .limit(1);

  if (vendorRow) {
    await db
      .update(vendors)
      .set({ name, contactEmail: email })
      .where(eq(vendors.id, vendorRow.id));
    if (user.public_metadata?.role !== "vendor") {
      await syncRoleToClerk(user.id, "vendor", user.public_metadata);
    }
    return;
  }

  // No DB row — defensive: an update for a user we've never seen. Treat
  // as a created event.
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

  const [vendorRow] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.clerkUserId, user.id))
    .limit(1);

  if (!vendorRow) return;

  await db.transaction(async (tx) => {
    await tx.insert(auditLog).values({
      adminId: null,
      action: "vendor.gdpr_delete",
      targetType: "vendor",
      targetId: String(vendorRow.id),
      before: vendorRow,
      after: null,
    });
    await tx
      .update(vendors)
      .set({
        name: "[deleted vendor]",
        contactEmail: null,
        linkedinUrl: null,
        clerkUserId: null,
        suspended: true,
      })
      .where(eq(vendors.id, vendorRow.id));
    await tx
      .update(apps)
      .set({ status: "unpublished" })
      .where(eq(apps.vendorId, vendorRow.id));
  });
}
