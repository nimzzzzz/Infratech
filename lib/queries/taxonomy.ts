import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  stages,
  capabilities,
  industries,
  pricingModels,
  regions,
  apps,
  appStages,
} from "@/lib/db/schema";

export const listStages = () =>
  db.select().from(stages).orderBy(stages.position);

export const listCapabilities = () =>
  db.select().from(capabilities).orderBy(capabilities.name);

export const listIndustries = () =>
  db.select().from(industries).orderBy(industries.name);

export const listPricingModels = () =>
  db.select().from(pricingModels).orderBy(pricingModels.name);

export const listRegions = () =>
  db.select().from(regions).orderBy(regions.name);

export async function getStageBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(stages)
    .where(eq(stages.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getCapabilityBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(capabilities)
    .where(eq(capabilities.slug, slug))
    .limit(1);
  return row ?? null;
}

/**
 * All stages with their published-app counts. Single query — homepage
 * renders 6 stage cards each showing how many tools live in that bucket.
 */
export type StageWithCount = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  position: number;
  appCount: number;
};

export async function listStagesWithCounts(): Promise<StageWithCount[]> {
  const rows = await db
    .select({
      id: stages.id,
      slug: stages.slug,
      name: stages.name,
      shortDescription: stages.shortDescription,
      position: stages.position,
      appCount: sql<number>`count(distinct ${apps.id})::int`,
    })
    .from(stages)
    .leftJoin(appStages, eq(appStages.stageId, stages.id))
    .leftJoin(
      apps,
      and(eq(apps.id, appStages.appId), eq(apps.status, "published")),
    )
    .groupBy(stages.id)
    .orderBy(stages.position);
  return rows;
}
