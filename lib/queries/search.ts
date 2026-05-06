import "server-only";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  apps,
  vendors,
  appStages,
  stages,
  appCapabilities,
  capabilities,
  appIndustries,
  industries,
  appPricingModels,
  pricingModels,
} from "@/lib/db/schema";
import { type AppCard } from "./apps";

export type SearchFilters = {
  q?: string;
  stage?: string[];
  capability?: string[];
  pricing?: string[];
  industry?: string[];
  page?: number;
  pageSize?: number;
};

export type SearchResult = {
  results: AppCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const DEFAULT_PAGE_SIZE = 24;

/**
 * Translate a slug array into a subquery returning matching app_ids — used
 * inside the AND-across-categories WHERE clause. Returns null if the
 * filter list is empty (caller skips the predicate entirely).
 */
function appsMatchingTag(
  slugs: string[],
  joinTable: typeof appStages | typeof appCapabilities | typeof appIndustries | typeof appPricingModels,
  tagTable: typeof stages | typeof capabilities | typeof industries | typeof pricingModels,
  joinFk:
    | typeof appStages.stageId
    | typeof appCapabilities.capabilityId
    | typeof appIndustries.industryId
    | typeof appPricingModels.pricingModelId,
  joinAppId:
    | typeof appStages.appId
    | typeof appCapabilities.appId
    | typeof appIndustries.appId
    | typeof appPricingModels.appId,
): SQL | null {
  if (slugs.length === 0) return null;
  return inArray(
    apps.id,
    db
      .select({ appId: joinAppId })
      .from(joinTable)
      .innerJoin(tagTable, eq(joinFk, tagTable.id))
      .where(inArray(tagTable.slug, slugs)),
  );
}

/**
 * Sanitise user search input into a Postgres tsquery expression suitable
 * for prefix matching. The indexed search_vector stores Porter-stemmed
 * tokens (e.g. "scheduling" → "schedul"), so naïve plainto_tsquery on
 * partial input like "sched" returns no matches because "sched" isn't
 * a recognised English stem. Adding the :* suffix makes each token a
 * prefix match — "sched:*" matches the indexed token "schedul".
 */
function buildPrefixTsquery(q: string | undefined | null): string | null {
  if (!q) return null;
  const tokens = q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `${t}:*`).join(" & ");
}

/**
 * Build the shared WHERE clause used by both the result query and the
 * COUNT query. status='published' is non-negotiable; q runs against the
 * tsvector column with a sanitised prefix tsquery; each tag filter is an
 * OR-within (slug IN list) wrapped in an AND-across composition.
 */
function buildConditions(filters: SearchFilters): SQL[] {
  const conditions: SQL[] = [eq(apps.status, "published")];

  const prefixTsquery = buildPrefixTsquery(filters.q);
  if (prefixTsquery) {
    conditions.push(
      sql`${apps.searchVector} @@ to_tsquery('english', ${prefixTsquery})`,
    );
  }

  const stageCond = appsMatchingTag(
    filters.stage ?? [],
    appStages,
    stages,
    appStages.stageId,
    appStages.appId,
  );
  if (stageCond) conditions.push(stageCond);

  const capCond = appsMatchingTag(
    filters.capability ?? [],
    appCapabilities,
    capabilities,
    appCapabilities.capabilityId,
    appCapabilities.appId,
  );
  if (capCond) conditions.push(capCond);

  const indCond = appsMatchingTag(
    filters.industry ?? [],
    appIndustries,
    industries,
    appIndustries.industryId,
    appIndustries.appId,
  );
  if (indCond) conditions.push(indCond);

  const priCond = appsMatchingTag(
    filters.pricing ?? [],
    appPricingModels,
    pricingModels,
    appPricingModels.pricingModelId,
    appPricingModels.appId,
  );
  if (priCond) conditions.push(priCond);

  return conditions;
}

/**
 * Always alphabetical by name. Sort tabs (recent / featured / relevance)
 * were removed in the design refresh — there's exactly one ordering now.
 */
export async function searchApps(
  filters: SearchFilters,
): Promise<SearchResult> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const conditions = buildConditions(filters);

  // COUNT(*) and the paginated id select share the same WHERE clause and
  // don't depend on each other — fire them in parallel. Saves one RTT.
  const [totalRows, idRows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(apps)
      .where(and(...conditions)),
    db
      .select({ id: apps.id })
      .from(apps)
      .where(and(...conditions))
      .orderBy(asc(apps.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);
  const total = totalRows[0]?.total ?? 0;

  const ids = idRows.map((r) => r.id);
  const results = await fetchCardsInOrder(ids);

  return {
    results,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Re-uses the shape of fetchCards from lib/queries/apps.ts but inline here
 * to avoid an import cycle (search → apps → search). Keeping the
 * implementations parallel — if either changes, update the other.
 */
async function fetchCardsInOrder(ids: number[]): Promise<AppCard[]> {
  if (ids.length === 0) return [];

  const [baseRows, stageRows, capRows, indRows, pricingRows] = await Promise.all([
    db
      .select({
        id: apps.id,
        slug: apps.slug,
        name: apps.name,
        tagline: apps.tagline,
        logoUrl: apps.logoUrl,
        publishedAt: apps.publishedAt,
        vendorSlug: vendors.slug,
        vendorName: vendors.name,
      })
      .from(apps)
      .innerJoin(vendors, eq(vendors.id, apps.vendorId))
      .where(inArray(apps.id, ids)),
    db
      .select({ appId: appStages.appId, slug: stages.slug, name: stages.name })
      .from(appStages)
      .innerJoin(stages, eq(stages.id, appStages.stageId))
      .where(inArray(appStages.appId, ids)),
    db
      .select({ appId: appCapabilities.appId, slug: capabilities.slug })
      .from(appCapabilities)
      .innerJoin(capabilities, eq(capabilities.id, appCapabilities.capabilityId))
      .where(inArray(appCapabilities.appId, ids)),
    db
      .select({ appId: appIndustries.appId, slug: industries.slug })
      .from(appIndustries)
      .innerJoin(industries, eq(industries.id, appIndustries.industryId))
      .where(inArray(appIndustries.appId, ids)),
    db
      .select({ appId: appPricingModels.appId, slug: pricingModels.slug })
      .from(appPricingModels)
      .innerJoin(
        pricingModels,
        eq(pricingModels.id, appPricingModels.pricingModelId),
      )
      .where(inArray(appPricingModels.appId, ids)),
  ]);

  const stagesByApp = new Map<number, { slug: string; name: string }[]>();
  for (const r of stageRows) {
    const arr = stagesByApp.get(r.appId) ?? [];
    arr.push({ slug: r.slug, name: r.name });
    stagesByApp.set(r.appId, arr);
  }
  const capsByApp = new Map<number, string[]>();
  for (const r of capRows) {
    const arr = capsByApp.get(r.appId) ?? [];
    arr.push(r.slug);
    capsByApp.set(r.appId, arr);
  }
  const indsByApp = new Map<number, string[]>();
  for (const r of indRows) {
    const arr = indsByApp.get(r.appId) ?? [];
    arr.push(r.slug);
    indsByApp.set(r.appId, arr);
  }
  const pricingByApp = new Map<number, string>();
  for (const r of pricingRows) pricingByApp.set(r.appId, r.slug);

  const byId = new Map<number, AppCard>();
  for (const b of baseRows) {
    byId.set(b.id, {
      id: b.id,
      slug: b.slug,
      name: b.name,
      tagline: b.tagline,
      logoUrl: b.logoUrl,
      vendor: { slug: b.vendorSlug, name: b.vendorName },
      pricingSlug: pricingByApp.get(b.id) ?? null,
      stages: stagesByApp.get(b.id) ?? [],
      capabilitySlugs: capsByApp.get(b.id) ?? [],
      industrySlugs: indsByApp.get(b.id) ?? [],
      publishedAt: b.publishedAt,
    });
  }

  return ids.map((id) => byId.get(id)).filter((c): c is AppCard => !!c);
}
