/* eslint-disable no-console */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

import { stages as mockStages } from "@/lib/data/stages";
import {
  capabilities as mockCapabilities,
  industries as mockIndustries,
  pricingModels as mockPricingModels,
  regions as mockRegions,
} from "@/lib/data/taxonomy";
import { vendors as mockVendors } from "@/lib/data/vendors";
import { apps as mockApps } from "@/lib/data/apps";
import { queue as mockSubmissions } from "@/lib/data/admin-queue";

/**
 * Seed script.
 *
 * Idempotent via TRUNCATE-then-INSERT inside a single transaction. Refuses
 * to run with NODE_ENV=production unless ALLOW_PROD_SEED=1 is set.
 *
 * Order matters because of FK constraints:
 *   taxonomy → vendors → apps → app_M2M joins → submissions
 *
 * Messages from lib/data/messages.ts are deliberately NOT seeded — the
 * mock data references a demo "arctus" vendor + "arctus-field" app that
 * don't exist in the public catalogue. They live only in the dashboard
 * preview fixtures, not in the public listings.
 */

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const mapSubStatus = (
  s: string,
): "pending" | "in_review" | "changes_requested" | "approved" | "rejected" => {
  if (s === "in-review") return "in_review";
  if (s === "changes-requested") return "changes_requested";
  return s as "pending" | "approved" | "rejected";
};

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PROD_SEED !== "1"
  ) {
    throw new Error(
      "Seed refused: NODE_ENV=production. Set ALLOW_PROD_SEED=1 to override.",
    );
  }

  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED is required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("Seeding…");

  await db.transaction(async (tx) => {
    console.log("  truncating tables…");
    await tx.execute(sql`
      TRUNCATE TABLE
        outbound_clicks, app_views, audit_log, suggestions,
        contact_messages, submissions,
        app_screenshots, app_pricing_models, app_industries,
        app_capabilities, app_stages,
        apps, vendor_regions, vendors,
        admins,
        stages, capabilities, industries, pricing_models, regions
      RESTART IDENTITY CASCADE
    `);

    // 1. Taxonomy
    const stageRows = await tx
      .insert(schema.stages)
      .values(
        mockStages.map((s, i) => ({
          slug: s.slug,
          name: s.name,
          shortDescription: s.short,
          position: i,
        })),
      )
      .returning({ id: schema.stages.id, slug: schema.stages.slug });
    const stageIdBySlug = new Map(stageRows.map((r) => [r.slug, r.id]));

    const capRows = await tx
      .insert(schema.capabilities)
      .values(mockCapabilities.map((c) => ({ slug: c.slug, name: c.name })))
      .returning({ id: schema.capabilities.id, slug: schema.capabilities.slug });
    const capIdBySlug = new Map(capRows.map((r) => [r.slug, r.id]));

    const indRows = await tx
      .insert(schema.industries)
      .values(mockIndustries.map((i) => ({ slug: i.slug, name: i.name })))
      .returning({ id: schema.industries.id, slug: schema.industries.slug });
    const indIdBySlug = new Map(indRows.map((r) => [r.slug, r.id]));

    const pmRows = await tx
      .insert(schema.pricingModels)
      .values(mockPricingModels.map((p) => ({ slug: p.slug, name: p.name })))
      .returning({
        id: schema.pricingModels.id,
        slug: schema.pricingModels.slug,
      });
    const pmIdBySlug = new Map(pmRows.map((r) => [r.slug, r.id]));

    const regionRows = await tx
      .insert(schema.regions)
      .values(mockRegions.map((r) => ({ slug: r.slug, name: r.name })))
      .returning({ id: schema.regions.id });

    console.log(
      `  taxonomy: ${stageRows.length} stages, ${capRows.length} caps, ${indRows.length} inds, ${pmRows.length} pms, ${regionRows.length} regions`,
    );

    // 2. Vendors
    const vendorRows = await tx
      .insert(schema.vendors)
      .values(
        mockVendors.map((v) => ({
          slug: v.slug,
          name: v.name,
          shortBlurb: v.shortBlurb,
          description: v.description,
          websiteUrl: v.websiteUrl,
          foundedYear: v.founded,
          employeeBand: v.employeeBand,
          hqCountry: v.headquarters,
          logoUrl: v.logoUrl ?? null,
          contactEmail: `contact@${v.slug}.example`,
        })),
      )
      .returning({ id: schema.vendors.id, slug: schema.vendors.slug });
    const vendorIdBySlug = new Map(vendorRows.map((r) => [r.slug, r.id]));

    console.log(`  vendors: ${vendorRows.length}`);

    // 3. Apps
    const appRows = await tx
      .insert(schema.apps)
      .values(
        mockApps.map((a) => {
          const vid = vendorIdBySlug.get(a.vendorSlug);
          if (!vid) throw new Error(`Unknown vendor slug: ${a.vendorSlug}`);
          return {
            slug: a.slug,
            name: a.name,
            tagline: a.blurb,
            description: a.description,
            websiteUrl: a.websiteUrl,
            foundedYear: a.founded,
            vendorId: vid,
            status: "published" as const,
            featured: a.featured,
            editorNote: a.editorNote ?? null,
            publishedAt: new Date(a.addedAt),
          };
        }),
      )
      .returning({ id: schema.apps.id, slug: schema.apps.slug });
    const appIdBySlug = new Map(appRows.map((r) => [r.slug, r.id]));

    // 4. App M2M joins
    const appStageVals: { appId: number; stageId: number }[] = [];
    const appCapVals: { appId: number; capabilityId: number }[] = [];
    const appIndVals: { appId: number; industryId: number }[] = [];
    const appPmVals: { appId: number; pricingModelId: number }[] = [];

    for (const a of mockApps) {
      const appId = appIdBySlug.get(a.slug)!;
      for (const s of a.stages) {
        const id = stageIdBySlug.get(s);
        if (id) appStageVals.push({ appId, stageId: id });
      }
      for (const c of a.capabilities) {
        const id = capIdBySlug.get(c);
        if (id) appCapVals.push({ appId, capabilityId: id });
      }
      for (const i of a.industries) {
        const id = indIdBySlug.get(i);
        if (id) appIndVals.push({ appId, industryId: id });
      }
      const pid = pmIdBySlug.get(a.pricing);
      if (pid) appPmVals.push({ appId, pricingModelId: pid });
    }

    if (appStageVals.length)
      await tx.insert(schema.appStages).values(appStageVals);
    if (appCapVals.length)
      await tx.insert(schema.appCapabilities).values(appCapVals);
    if (appIndVals.length)
      await tx.insert(schema.appIndustries).values(appIndVals);
    if (appPmVals.length)
      await tx.insert(schema.appPricingModels).values(appPmVals);

    console.log(
      `  apps: ${appRows.length} (joins: ${appStageVals.length} stages, ${appCapVals.length} caps, ${appIndVals.length} inds, ${appPmVals.length} pricing)`,
    );

    // 5. Submissions
    let submissionCount = 0;
    for (const sub of mockSubmissions) {
      const submitterSlug = slugify(sub.submitter.companyName);
      let submitterVendorId = vendorIdBySlug.get(submitterSlug);
      if (!submitterVendorId) {
        const [created] = await tx
          .insert(schema.vendors)
          .values({
            slug: submitterSlug,
            name: sub.submitter.companyName,
            contactEmail: sub.submitter.email,
            linkedinUrl: sub.submitter.linkedinUrl,
          })
          .returning({ id: schema.vendors.id });
        submitterVendorId = created.id;
        vendorIdBySlug.set(submitterSlug, submitterVendorId);
      }

      const targetAppId =
        sub.type === "claim" ? (appIdBySlug.get(sub.claimAppSlug) ?? null) : null;

      await tx.insert(schema.submissions).values({
        type: sub.type,
        status: mapSubStatus(sub.status),
        submitterVendorId,
        appId: targetAppId,
        payload: sub,
        submittedAt: new Date(sub.submittedAt),
      });
      submissionCount++;
    }
    console.log(`  submissions: ${submissionCount}`);
    console.log(
      `  messages: 0 (mock references demo 'arctus' vendor not in seed)`,
    );

    // 6. Seed demo admin so /admin renders in DEMO_MODE.
    await tx.insert(schema.admins).values({
      clerkUserId: "demo_admin_seed",
      name: "Sara Pellegrini",
      email: "sara@resolute.example",
      role: "admin",
    });
    console.log(`  admins: 1 (demo)`);
  });

  console.log("Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
