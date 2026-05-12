import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  apps,
  appCapabilities,
  appIndustries,
  appPricingModels,
  appStages,
  capabilities,
  industries,
  pricingModels,
  stages,
} from "@/lib/db/schema";

/**
 * Drizzle's transaction callback receives a slightly different type
 * than the top-level `db` (no $client, plus rollback). Both expose
 * the same `insert` / `update` / `select` / `delete` API though, so
 * helpers that need to work in either context type their `tx`
 * parameter as the callback's first argument. Extracted via
 * Parameters<...> so a Drizzle upgrade that tweaks the tx type
 * propagates cleanly without an import change.
 */
type Tx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

/**
 * Final payload shape used to construct an apps row on publish.
 * Mirrors the writer in /api/submissions/route.ts plus the admin's
 * possible edits. All fields optional so a partial payload doesn't
 * blow up; required fields (slug, name, url) are validated by the
 * caller before this runs.
 */
export type PublishPayload = {
  slug?: string;
  name?: string;
  url?: string;
  tagline?: string;
  description?: string;
  stages?: string[];
  capabilities?: string[];
  industries?: string[];
  pricing?: string;
};

/**
 * Resolve a final payload from the vendor's submission plus any
 * admin edits. Admin edits supersede field-by-field.
 */
export function resolveFinalPayload(
  payload: PublishPayload,
  adminEdits: PublishPayload | null,
): PublishPayload {
  if (!adminEdits) return payload;
  return { ...payload, ...adminEdits };
}

/**
 * Create or update the apps row + taxonomy joins from a final
 * payload. Idempotent on app_id: INSERTs on first publish, UPDATEs
 * on every publish after that. Always wipes + re-inserts the four
 * M2M taxonomy joins so admin re-edits land cleanly.
 *
 * Custom taxonomy proposals (`customCapabilities`, etc.) are not
 * promoted into canonical taxonomy here — that's a Phase A.4
 * workflow. The wizard's custom proposals stay on the submission's
 * payload for admin curation.
 *
 * Runs inside the caller's transaction. Returns the resolved
 * apps.id so the caller can write it back to submissions.app_id.
 */
export async function publishSubmissionInTx(
  tx: Tx,
  opts: {
    existingAppId: number | null;
    vendorId: number;
    finalPayload: PublishPayload;
  },
): Promise<{ appId: number; slug: string; name: string }> {
  const p = opts.finalPayload;
  if (!p.slug) throw new Error("publishSubmissionInTx: slug required");
  if (!p.name) throw new Error("publishSubmissionInTx: name required");
  if (!p.url) throw new Error("publishSubmissionInTx: url required");

  const base = {
    slug: p.slug,
    name: p.name,
    websiteUrl: p.url,
    tagline: p.tagline ?? null,
    description: p.description ?? null,
    status: "published" as const,
    publishedAt: new Date(),
    updatedAt: new Date(),
  };

  let appId: number;
  if (opts.existingAppId !== null) {
    const [updated] = await tx
      .update(apps)
      .set(base)
      .where(eq(apps.id, opts.existingAppId))
      .returning({ id: apps.id });
    if (!updated) {
      throw new Error(
        `publishSubmissionInTx: app id ${opts.existingAppId} not found`,
      );
    }
    appId = updated.id;
    await tx.delete(appStages).where(eq(appStages.appId, appId));
    await tx.delete(appCapabilities).where(eq(appCapabilities.appId, appId));
    await tx.delete(appIndustries).where(eq(appIndustries.appId, appId));
    await tx.delete(appPricingModels).where(eq(appPricingModels.appId, appId));
  } else {
    const [inserted] = await tx
      .insert(apps)
      .values({ ...base, vendorId: opts.vendorId })
      .returning({ id: apps.id });
    appId = inserted.id;
  }

  await Promise.all([
    insertStageJoins(tx, appId, p.stages ?? []),
    insertCapabilityJoins(tx, appId, p.capabilities ?? []),
    insertIndustryJoins(tx, appId, p.industries ?? []),
    insertPricingJoins(tx, appId, p.pricing ? [p.pricing] : []),
  ]);

  return { appId, slug: p.slug, name: p.name };
}

async function insertStageJoins(
  tx: Tx,
  appId: number,
  slugs: string[],
): Promise<void> {
  if (slugs.length === 0) return;
  const rows = await tx
    .select({ id: stages.id, slug: stages.slug })
    .from(stages)
    .where(inArray(stages.slug, slugs));
  if (rows.length === 0) return;
  await tx
    .insert(appStages)
    .values(rows.map((r) => ({ appId, stageId: r.id })));
}

async function insertCapabilityJoins(
  tx: Tx,
  appId: number,
  slugs: string[],
): Promise<void> {
  if (slugs.length === 0) return;
  const rows = await tx
    .select({ id: capabilities.id })
    .from(capabilities)
    .where(inArray(capabilities.slug, slugs));
  if (rows.length === 0) return;
  await tx
    .insert(appCapabilities)
    .values(rows.map((r) => ({ appId, capabilityId: r.id })));
}

async function insertIndustryJoins(
  tx: Tx,
  appId: number,
  slugs: string[],
): Promise<void> {
  if (slugs.length === 0) return;
  const rows = await tx
    .select({ id: industries.id })
    .from(industries)
    .where(inArray(industries.slug, slugs));
  if (rows.length === 0) return;
  await tx
    .insert(appIndustries)
    .values(rows.map((r) => ({ appId, industryId: r.id })));
}

async function insertPricingJoins(
  tx: Tx,
  appId: number,
  slugs: string[],
): Promise<void> {
  if (slugs.length === 0) return;
  const rows = await tx
    .select({ id: pricingModels.id })
    .from(pricingModels)
    .where(inArray(pricingModels.slug, slugs));
  if (rows.length === 0) return;
  await tx
    .insert(appPricingModels)
    .values(rows.map((r) => ({ appId, pricingModelId: r.id })));
}
