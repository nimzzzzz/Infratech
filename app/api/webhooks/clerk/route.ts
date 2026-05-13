import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import {
  vendors,
  vendorMembers,
  auditLog,
  apps,
} from "@/lib/db/schema";
import { isAdminEmail } from "@/lib/auth/admin-allowlist";

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
    /** Clerk includes verification status on each address; primary
     *  must be verified before we honour it for admin promotion. */
    verification?: { status?: "verified" | "unverified" | string } | null;
  }>;
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  /** V.2 — LinkedIn profile picture URL. Clerk synthesises one from
   *  the OAuth provider's avatar; missing when the LinkedIn account
   *  has no picture set. */
  image_url?: string | null;
  external_accounts: Array<{
    provider: string;
  }>;
  public_metadata: { role?: "vendor" | "admin"; is_admin?: boolean } & Record<
    string,
    unknown
  >;
};

type ClerkDeletedUser = {
  id: string;
  deleted: boolean;
};

type ClerkEvent =
  | { type: "user.created"; data: ClerkUser }
  | { type: "user.updated"; data: ClerkUser }
  | { type: "user.deleted"; data: ClerkDeletedUser };

function fullNameOf(u: ClerkUser): string {
  const parts = [u.first_name, u.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unnamed vendor";
}

/**
 * The user's primary email (any verification state). Used for the
 * vendor_members row's `primary_email` column — non-null, persists
 * even before verification because we need *some* contact value.
 */
function primaryEmailOf(u: ClerkUser): string | null {
  const primary = u.email_addresses.find(
    (e) => e.id === u.primary_email_address_id,
  );
  return primary?.email_address ?? u.email_addresses[0]?.email_address ?? null;
}

/**
 * The user's *verified* primary email — null if the primary address
 * isn't verified yet. Only this value should be checked against the
 * admin allowlist. Phase A.1 security boundary: an attacker who can
 * add an unverified email to their account must not gain admin via
 * the allowlist trip.
 */
function verifiedPrimaryEmailOf(u: ClerkUser): string | null {
  const primary = u.email_addresses.find(
    (e) => e.id === u.primary_email_address_id,
  );
  if (!primary) return null;
  if (primary.verification?.status !== "verified") return null;
  return primary.email_address;
}

/**
 * Compute is_admin for this user. True iff the primary email is
 * verified AND matches the CLERK_ADMIN_EMAILS allowlist. Conservative
 * by design — manual UPDATE in Neon SQL Editor is the path for
 * admins whose sign-in email isn't in the allowlist.
 */
function computeIsAdmin(user: ClerkUser): boolean {
  const verified = verifiedPrimaryEmailOf(user);
  return isAdminEmail(verified);
}

/**
 * Best-effort push of is_admin into Clerk publicMetadata so the
 * middleware can read the flag from the JWT claim without a DB
 * lookup on the hot path. Logs and breadcrumbs on failure — never
 * throws.
 *
 * Phase A.1 replaces the prior publicMetadata.role string with a
 * boolean publicMetadata.is_admin — single source of truth, no
 * enum drift. The legacy `role` key is left untouched (some Clerk
 * dashboards may still display it) but no production reader uses it.
 */
async function syncAdminFlagToClerk(
  userId: string,
  isAdmin: boolean,
  existingMeta: Record<string, unknown> | undefined,
): Promise<void> {
  try {
    const cc = await clerkClient();
    await cc.users.updateUserMetadata(userId, {
      publicMetadata: { ...(existingMeta ?? {}), is_admin: isAdmin },
    });
    console.info(
      `[clerk webhook] synced is_admin=${isAdmin} to Clerk metadata for user ${userId}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[clerk webhook] failed to sync is_admin=${isAdmin} for user ${userId}: ${message}`,
    );
    try {
      await db.insert(auditLog).values({
        adminId: null,
        action: "clerk.metadata_sync_failed",
        targetType: isAdmin ? "admin" : "vendor",
        targetId: userId,
        before: { intendedIsAdmin: isAdmin },
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
  const name = fullNameOf(user);
  const email = primaryEmailOf(user) ?? `${user.id}@unknown.example`;
  const isAdmin = computeIsAdmin(user);

  // Phase A.1 single-human-table model: ALL Clerk users land in
  // vendor_members. The is_admin flag (computed from the verified
  // primary email vs CLERK_ADMIN_EMAILS) is the only admin signal.
  // The legacy `admins` table is intentionally NOT touched — it's
  // retained for audit_log FK compatibility but has no readers /
  // writers post-A.1.
  //
  // vendor_id stays NULL — even for admins. The wizard at
  // /dashboard/onboarding/submit is where the vendor row gets
  // created for non-admin vendors; admins never go through that flow
  // and their vendor_id stays NULL forever (no impact — admin pages
  // don't read vendor_id).
  await db
    .insert(vendorMembers)
    .values({
      vendorId: null,
      clerkUserId: user.id,
      name,
      primaryEmail: email,
      avatarUrl: user.image_url ?? null,
      onboarded: false,
      isAdmin,
    })
    .onConflictDoNothing({ target: vendorMembers.clerkUserId });

  // Best-effort: push is_admin to Clerk publicMetadata so the
  // middleware reads it from the JWT without a DB query on the hot
  // path. Only sync when it differs (avoid noise on every webhook).
  if (user.public_metadata?.is_admin !== isAdmin) {
    await syncAdminFlagToClerk(user.id, isAdmin, user.public_metadata);
  }
}

async function handleUserUpdated(user: ClerkUser): Promise<void> {
  const name = fullNameOf(user);
  const email = primaryEmailOf(user);
  const isAdmin = computeIsAdmin(user);

  const [memberRow] = await db
    .select()
    .from(vendorMembers)
    .where(eq(vendorMembers.clerkUserId, user.id))
    .limit(1);

  if (!memberRow) {
    // No DB row — defensive: an update for a user we've never seen.
    // Treat as a created event.
    console.warn(
      `[clerk webhook] user.updated for ${user.id} but no DB row exists; treating as created`,
    );
    await handleUserCreated(user);
    return;
  }

  // Promote-only semantics on update. The webhook will FLIP
  // is_admin from false → true if the user's primary email enters
  // the allowlist, but will NEVER flip true → false on update.
  // That preserves manual UPDATEs run by an operator for admins
  // whose sign-in email isn't in CLERK_ADMIN_EMAILS (the runbook
  // pattern). To revoke admin, run `UPDATE vendor_members SET
  // is_admin = false WHERE id = X` directly — there is no
  // automatic demotion path.
  const nextIsAdmin = memberRow.isAdmin || isAdmin;

  const patch: {
    name: string;
    primaryEmail?: string;
    avatarUrl: string | null;
    isAdmin: boolean;
    updatedAt: Date;
  } = {
    name,
    avatarUrl: user.image_url ?? null,
    isAdmin: nextIsAdmin,
    updatedAt: new Date(),
  };
  if (email) patch.primaryEmail = email;

  await db
    .update(vendorMembers)
    .set(patch)
    .where(eq(vendorMembers.id, memberRow.id));

  if (user.public_metadata?.is_admin !== nextIsAdmin) {
    await syncAdminFlagToClerk(user.id, nextIsAdmin, user.public_metadata);
  }
}

async function handleUserDeleted(user: ClerkDeletedUser): Promise<void> {
  // Single-human-table model: admins are vendor_members rows with
  // is_admin=true. Anonymisation applies to both — admin or vendor —
  // following the same audit + suspend pattern. The legacy admins-
  // table hard-delete branch was removed in Phase A.1.
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
