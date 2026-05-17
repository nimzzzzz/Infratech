import "server-only";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  apps,
  vendors,
  stages,
  capabilities,
  industries,
  pricingModels,
  regions,
  appStages,
  appCapabilities,
  appIndustries,
  appPricingModels,
  appScreenshots,
  vendorRegions,
  type App,
  type AppStatus,
  type AppScreenshot,
} from "@/lib/db/schema";

/**
 * Card shape — what `<AppCard>` and the home/stage/capability lists need.
 * Drops description and other heavy fields so the row stays small.
 */
export type AppCard = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  vendor: { slug: string; name: string };
  pricingSlugs: string[];
  stages: { slug: string; name: string }[];
  /** Slug-only arrays used by the filter / sort logic. */
  capabilitySlugs: string[];
  industrySlugs: string[];
  publishedAt: Date | null;
};

/** Full detail shape for /apps/[slug]. */
export type AppDetail = App & {
  vendor: {
    slug: string;
    name: string;
    websiteUrl: string | null;
    foundedYear: number | null;
    hqCountry: string | null;
  };
  /** Vendor's served-region slugs (NOT including the UI-only "global"
   *  meta-chip). Used by the product page's "About the vendor" card
   *  to render the Regions served row + the "All regions" shortcut. */
  vendorRegionSlugs: string[];
  stages: { slug: string; name: string }[];
  capabilities: { slug: string; name: string }[];
  industries: { slug: string; name: string }[];
  pricingModels: { slug: string; name: string }[];
  screenshots: AppScreenshot[];
};

/** Single SQL roundtrip → array of cards in stable order. */
async function fetchCards(appIds: number[]): Promise<AppCard[]> {
  if (appIds.length === 0) return [];

  // All five fetches are independent — fire them concurrently against the
  // same Neon connection. Was 5 sequential RTTs; now 1 RTT batch.
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
      .where(inArray(apps.id, appIds)),
    db
      .select({ appId: appStages.appId, slug: stages.slug, name: stages.name })
      .from(appStages)
      .innerJoin(stages, eq(stages.id, appStages.stageId))
      .where(inArray(appStages.appId, appIds)),
    db
      .select({ appId: appCapabilities.appId, slug: capabilities.slug })
      .from(appCapabilities)
      .innerJoin(capabilities, eq(capabilities.id, appCapabilities.capabilityId))
      .where(inArray(appCapabilities.appId, appIds)),
    db
      .select({ appId: appIndustries.appId, slug: industries.slug })
      .from(appIndustries)
      .innerJoin(industries, eq(industries.id, appIndustries.industryId))
      .where(inArray(appIndustries.appId, appIds)),
    db
      .select({ appId: appPricingModels.appId, slug: pricingModels.slug })
      .from(appPricingModels)
      .innerJoin(
        pricingModels,
        eq(pricingModels.id, appPricingModels.pricingModelId),
      )
      .where(inArray(appPricingModels.appId, appIds)),
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
  const pricingByApp = new Map<number, string[]>();
  for (const r of pricingRows) {
    const arr = pricingByApp.get(r.appId) ?? [];
    arr.push(r.slug);
    pricingByApp.set(r.appId, arr);
  }

  const byId = new Map<number, AppCard>();
  for (const b of baseRows) {
    byId.set(b.id, {
      id: b.id,
      slug: b.slug,
      name: b.name,
      tagline: b.tagline,
      logoUrl: b.logoUrl,
      vendor: { slug: b.vendorSlug, name: b.vendorName },
      pricingSlugs: pricingByApp.get(b.id) ?? [],
      stages: stagesByApp.get(b.id) ?? [],
      capabilitySlugs: capsByApp.get(b.id) ?? [],
      industrySlugs: indsByApp.get(b.id) ?? [],
      publishedAt: b.publishedAt,
    });
  }

  // Preserve the input order
  return appIds.map((id) => byId.get(id)).filter((c): c is AppCard => !!c);
}

/** Resolve an app slug to id + verify it's published. */
async function getPublishedAppIdBySlug(slug: string) {
  const [row] = await db
    .select({ id: apps.id })
    .from(apps)
    .where(and(eq(apps.slug, slug), eq(apps.status, "published")))
    .limit(1);
  return row?.id ?? null;
}

export async function getAppBySlug(slug: string): Promise<AppDetail | null> {
  const [base] = await db
    .select({
      app: apps,
      vendor: {
        slug: vendors.slug,
        name: vendors.name,
        websiteUrl: vendors.websiteUrl,
        foundedYear: vendors.foundedYear,
        hqCountry: vendors.hqCountry,
      },
    })
    .from(apps)
    .innerJoin(vendors, eq(vendors.id, apps.vendorId))
    .where(and(eq(apps.slug, slug), eq(apps.status, "published")))
    .limit(1);
  if (!base) return null;
  return loadAppDetailFromBase(base);
}

/**
 * Same shape as getAppBySlug but keyed on apps.id and NOT filtered
 * on status="published" — the product edit page needs to load an
 * app regardless of publish state (an admin-unpublished product
 * whose edit is mid-review is still legitimately reachable by the
 * owning vendor). Ownership is verified at the page level so we
 * don't gate it here.
 */
export async function getAppById(appId: number): Promise<AppDetail | null> {
  const [base] = await db
    .select({
      app: apps,
      vendor: {
        slug: vendors.slug,
        name: vendors.name,
        websiteUrl: vendors.websiteUrl,
        foundedYear: vendors.foundedYear,
        hqCountry: vendors.hqCountry,
      },
    })
    .from(apps)
    .innerJoin(vendors, eq(vendors.id, apps.vendorId))
    .where(eq(apps.id, appId))
    .limit(1);
  if (!base) return null;
  return loadAppDetailFromBase(base);
}

/**
 * Shared join-fetcher used by getAppBySlug + getAppById. Takes the
 * already-resolved base row (apps + thin vendor projection) and
 * loads the remaining joins (taxonomy, screenshots, vendor regions)
 * in a single parallel batch.
 */
async function loadAppDetailFromBase(base: {
  app: App;
  vendor: AppDetail["vendor"];
}): Promise<AppDetail> {
  const [stageRows, capRows, indRows, pricingRows, screenshots, vendorRegionSlugs] =
    await Promise.all([
      db
        .select({ slug: stages.slug, name: stages.name })
        .from(appStages)
        .innerJoin(stages, eq(stages.id, appStages.stageId))
        .where(eq(appStages.appId, base.app.id)),
      db
        .select({ slug: capabilities.slug, name: capabilities.name })
        .from(appCapabilities)
        .innerJoin(
          capabilities,
          eq(capabilities.id, appCapabilities.capabilityId),
        )
        .where(eq(appCapabilities.appId, base.app.id)),
      db
        .select({ slug: industries.slug, name: industries.name })
        .from(appIndustries)
        .innerJoin(industries, eq(industries.id, appIndustries.industryId))
        .where(eq(appIndustries.appId, base.app.id)),
      db
        .select({ slug: pricingModels.slug, name: pricingModels.name })
        .from(appPricingModels)
        .innerJoin(
          pricingModels,
          eq(pricingModels.id, appPricingModels.pricingModelId),
        )
        .where(eq(appPricingModels.appId, base.app.id)),
      db
        .select()
        .from(appScreenshots)
        .where(eq(appScreenshots.appId, base.app.id))
        .orderBy(appScreenshots.position),
      db
        .select({ slug: regions.slug })
        .from(vendorRegions)
        .innerJoin(regions, eq(regions.id, vendorRegions.regionId))
        .where(eq(vendorRegions.vendorId, base.app.vendorId))
        .then((rows) => rows.map((r) => r.slug)),
    ]);

  return {
    ...base.app,
    vendor: base.vendor,
    vendorRegionSlugs,
    stages: stageRows,
    capabilities: capRows,
    industries: indRows,
    pricingModels: pricingRows,
    screenshots,
  };
}

export async function listApps(opts?: {
  status?: AppStatus;
  limit?: number;
}): Promise<AppCard[]> {
  const status = opts?.status ?? "published";

  const rows = await db
    .select({ id: apps.id })
    .from(apps)
    .where(eq(apps.status, status))
    .orderBy(apps.name)
    .limit(opts?.limit ?? 1000);

  return fetchCards(rows.map((r) => r.id));
}

export async function listAppsByStage(stageSlug: string): Promise<AppCard[]> {
  const ids = await db
    .select({ id: apps.id })
    .from(apps)
    .innerJoin(appStages, eq(appStages.appId, apps.id))
    .innerJoin(stages, eq(stages.id, appStages.stageId))
    .where(and(eq(stages.slug, stageSlug), eq(apps.status, "published")))
    .orderBy(apps.name);
  return fetchCards(ids.map((r) => r.id));
}

export async function listAppsByCapability(
  capabilitySlug: string,
): Promise<AppCard[]> {
  const ids = await db
    .select({ id: apps.id })
    .from(apps)
    .innerJoin(appCapabilities, eq(appCapabilities.appId, apps.id))
    .innerJoin(
      capabilities,
      eq(capabilities.id, appCapabilities.capabilityId),
    )
    .where(
      and(eq(capabilities.slug, capabilitySlug), eq(apps.status, "published")),
    )
    .orderBy(apps.name);
  return fetchCards(ids.map((r) => r.id));
}

export async function listAppsByIndustry(
  industrySlug: string,
): Promise<AppCard[]> {
  const ids = await db
    .select({ id: apps.id })
    .from(apps)
    .innerJoin(appIndustries, eq(appIndustries.appId, apps.id))
    .innerJoin(industries, eq(industries.id, appIndustries.industryId))
    .where(
      and(eq(industries.slug, industrySlug), eq(apps.status, "published")),
    )
    .orderBy(apps.name);
  return fetchCards(ids.map((r) => r.id));
}

export async function listAppsByVendorSlug(
  vendorSlug: string,
): Promise<AppCard[]> {
  const ids = await db
    .select({ id: apps.id })
    .from(apps)
    .innerJoin(vendors, eq(vendors.id, apps.vendorId))
    .where(and(eq(vendors.slug, vendorSlug), eq(apps.status, "published")))
    .orderBy(apps.name);
  return fetchCards(ids.map((r) => r.id));
}

/**
 * For the vendor dashboard — returns ALL of the vendor's apps regardless
 * of status, with the status field exposed for the badge UI.
 */
export type OwnerAppRow = {
  id: number;
  slug: string;
  name: string;
  status: AppStatus;
  publishedAt: Date | null;
  createdAt: Date;
};

export async function listAppsForOwnerVendor(
  vendorId: number,
): Promise<OwnerAppRow[]> {
  return db
    .select({
      id: apps.id,
      slug: apps.slug,
      name: apps.name,
      status: apps.status,
      publishedAt: apps.publishedAt,
      createdAt: apps.createdAt,
    })
    .from(apps)
    .where(eq(apps.vendorId, vendorId))
    .orderBy(desc(apps.createdAt));
}

export async function listAllAppSlugs() {
  const rows = await db
    .select({ slug: apps.slug })
    .from(apps)
    .where(eq(apps.status, "published"));
  return rows.map((r) => r.slug);
}

/**
 * Apps sharing one or more stages with the given app. Excludes the source
 * app itself. Ordered by overlap count desc, then name.
 */
export async function listRelatedApps(
  appId: number,
  limit = 4,
): Promise<AppCard[]> {
  const rows = await db
    .select({ id: apps.id, overlap: sql<number>`count(*)`.as("overlap") })
    .from(apps)
    .innerJoin(appStages, eq(appStages.appId, apps.id))
    .where(
      and(
        eq(apps.status, "published"),
        ne(apps.id, appId),
        inArray(
          appStages.stageId,
          db
            .select({ stageId: appStages.stageId })
            .from(appStages)
            .where(eq(appStages.appId, appId)),
        ),
      ),
    )
    .groupBy(apps.id)
    .orderBy(desc(sql`count(*)`), apps.name)
    .limit(limit);
  return fetchCards(rows.map((r) => r.id));
}
