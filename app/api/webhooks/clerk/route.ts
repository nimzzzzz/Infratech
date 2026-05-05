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
 *  • user.created — infer role: vendors come in via LinkedIn OAuth
 *    (external_accounts contains "oauth_linkedin_oidc"); admins are
 *    expected to arrive via invitation with role pre-set on the
 *    invitation's publicMetadata. If role is missing on a non-LinkedIn
 *    sign-up we default to vendor and stamp the metadata back to Clerk.
 *  • user.updated — sync name/email on the matching vendor or admin row.
 *  • user.deleted — vendors are anonymised + their published apps are
 *    transitioned to "unpublished"; admins are hard-deleted. Either
 *    operation writes an audit_log row with admin_id=NULL.
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
  public_metadata: { role?: "vendor" | "admin" };
};

type ClerkDeletedUser = {
  id: string;
  deleted: boolean;
};

type ClerkEvent =
  | { type: "user.created"; data: ClerkUser }
  | { type: "user.updated"; data: ClerkUser }
  | { type: "user.deleted"; data: ClerkDeletedUser };

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

function isLinkedInSignup(u: ClerkUser): boolean {
  return u.external_accounts.some((a) =>
    a.provider.toLowerCase().includes("linkedin"),
  );
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

async function handleUserCreated(user: ClerkUser) {
  let role = user.public_metadata?.role;

  // Infer role for LinkedIn signups that don't carry one.
  if (!role) {
    role = isLinkedInSignup(user) ? "vendor" : "vendor";
    const cc = await clerkClient();
    await cc.users.updateUserMetadata(user.id, {
      publicMetadata: { ...user.public_metadata, role },
    });
  }

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
    return;
  }

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

async function handleUserUpdated(user: ClerkUser) {
  const role = user.public_metadata?.role;
  const name = fullNameOf(user);
  const email = primaryEmailOf(user);

  if (role === "admin") {
    if (email)
      await db
        .update(admins)
        .set({ name, email })
        .where(eq(admins.clerkUserId, user.id));
    return;
  }

  await db
    .update(vendors)
    .set({ name, contactEmail: email })
    .where(eq(vendors.clerkUserId, user.id));
}

async function handleUserDeleted(user: ClerkDeletedUser) {
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
