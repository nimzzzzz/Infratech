import "server-only";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  apps,
  appStages,
  stages,
  appCapabilities,
  capabilities,
  appIndustries,
  industries,
  appPricingModels,
  pricingModels,
} from "@/lib/db/schema";
import type { SearchFilters } from "./search";

export type FacetCounts = {
  stage: Record<string, number>;
  capability: Record<string, number>;
  pricing: Record<string, number>;
  industry: Record<string, number>;
};

/**
 * Returns counts per filter option, computed against the current filter
 * context with ONE category excluded — i.e. each option's count answers
 * "if I add this option, how many apps would I see?". Standard library /
 * e-commerce facet behaviour.
 *
 * The single-CTE version of this query is doable but ugly to read and
 * debug; per Stage 2 spec we run four small parallel queries instead.
 * At <100 apps the wall-clock is dominated by network, not query count
 * (~50ms total over Promise.all). Stage 7 perf review can collapse to
 * a single query if the catalogue grows past several thousand apps.
 */
export async function getFilterFacets(
  filters: SearchFilters,
): Promise<FacetCounts> {
  const [stageRows, capRows, indRows, priRows] = await Promise.all([
    facetByCategory("stage", filters),
    facetByCategory("capability", filters),
    facetByCategory("industry", filters),
    facetByCategory("pricing", filters),
  ]);

  const toRecord = (rows: { slug: string; n: number }[]) => {
    const out: Record<string, number> = {};
    for (const r of rows) out[r.slug] = r.n;
    return out;
  };

  return {
    stage: toRecord(stageRows),
    capability: toRecord(capRows),
    industry: toRecord(indRows),
    pricing: toRecord(priRows),
  };
}

type Category = "stage" | "capability" | "industry" | "pricing";

/**
 * For a given category, count apps grouped by that category's tag slug,
 * with all OTHER active category filters applied + q applied.
 *
 * The LEFT JOIN against apps ensures every tag slug appears in the
 * result even when its count is zero (so the sidebar can render greyed
 * options instead of hiding them).
 */
async function facetByCategory(
  category: Category,
  filters: SearchFilters,
): Promise<{ slug: string; n: number }[]> {
  const tagFilterSubquery = (
    slugs: string[],
    joinTable:
      | typeof appStages
      | typeof appCapabilities
      | typeof appIndustries
      | typeof appPricingModels,
    tagTable:
      | typeof stages
      | typeof capabilities
      | typeof industries
      | typeof pricingModels,
    fkCol:
      | typeof appStages.stageId
      | typeof appCapabilities.capabilityId
      | typeof appIndustries.industryId
      | typeof appPricingModels.pricingModelId,
    appIdCol:
      | typeof appStages.appId
      | typeof appCapabilities.appId
      | typeof appIndustries.appId
      | typeof appPricingModels.appId,
  ): SQL | null => {
    if (slugs.length === 0) return null;
    return inArray(
      apps.id,
      db
        .select({ appId: appIdCol })
        .from(joinTable)
        .innerJoin(tagTable, eq(fkCol, tagTable.id))
        .where(inArray(tagTable.slug, slugs)),
    );
  };

  // Build the "other categories" predicates — for the category we're
  // computing, intentionally drop its own filter from the predicate set.
  const otherCategoryConditions: SQL[] = [];
  if (category !== "stage") {
    const c = tagFilterSubquery(
      filters.stage ?? [],
      appStages,
      stages,
      appStages.stageId,
      appStages.appId,
    );
    if (c) otherCategoryConditions.push(c);
  }
  if (category !== "capability") {
    const c = tagFilterSubquery(
      filters.capability ?? [],
      appCapabilities,
      capabilities,
      appCapabilities.capabilityId,
      appCapabilities.appId,
    );
    if (c) otherCategoryConditions.push(c);
  }
  if (category !== "industry") {
    const c = tagFilterSubquery(
      filters.industry ?? [],
      appIndustries,
      industries,
      appIndustries.industryId,
      appIndustries.appId,
    );
    if (c) otherCategoryConditions.push(c);
  }
  if (category !== "pricing") {
    const c = tagFilterSubquery(
      filters.pricing ?? [],
      appPricingModels,
      pricingModels,
      appPricingModels.pricingModelId,
      appPricingModels.appId,
    );
    if (c) otherCategoryConditions.push(c);
  }

  const qCondition: SQL | null =
    filters.q && filters.q.trim()
      ? sql`${apps.searchVector} @@ plainto_tsquery('english', ${filters.q})`
      : null;

  const appJoinConditions: SQL[] = [eq(apps.status, "published")];
  if (qCondition) appJoinConditions.push(qCondition);
  for (const c of otherCategoryConditions) appJoinConditions.push(c);

  if (category === "stage") {
    return db
      .select({
        slug: stages.slug,
        n: sql<number>`count(distinct ${apps.id})::int`,
      })
      .from(stages)
      .leftJoin(appStages, eq(appStages.stageId, stages.id))
      .leftJoin(
        apps,
        and(eq(apps.id, appStages.appId), ...appJoinConditions),
      )
      .groupBy(stages.slug);
  }
  if (category === "capability") {
    return db
      .select({
        slug: capabilities.slug,
        n: sql<number>`count(distinct ${apps.id})::int`,
      })
      .from(capabilities)
      .leftJoin(
        appCapabilities,
        eq(appCapabilities.capabilityId, capabilities.id),
      )
      .leftJoin(
        apps,
        and(eq(apps.id, appCapabilities.appId), ...appJoinConditions),
      )
      .groupBy(capabilities.slug);
  }
  if (category === "industry") {
    return db
      .select({
        slug: industries.slug,
        n: sql<number>`count(distinct ${apps.id})::int`,
      })
      .from(industries)
      .leftJoin(appIndustries, eq(appIndustries.industryId, industries.id))
      .leftJoin(
        apps,
        and(eq(apps.id, appIndustries.appId), ...appJoinConditions),
      )
      .groupBy(industries.slug);
  }
  // pricing
  return db
    .select({
      slug: pricingModels.slug,
      n: sql<number>`count(distinct ${apps.id})::int`,
    })
    .from(pricingModels)
    .leftJoin(
      appPricingModels,
      eq(appPricingModels.pricingModelId, pricingModels.id),
    )
    .leftJoin(
      apps,
      and(eq(apps.id, appPricingModels.appId), ...appJoinConditions),
    )
    .groupBy(pricingModels.slug);
}
