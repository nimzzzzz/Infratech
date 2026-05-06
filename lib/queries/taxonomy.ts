import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  stages,
  capabilities,
  industries,
  pricingModels,
  regions,
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
