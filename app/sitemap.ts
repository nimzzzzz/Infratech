import type { MetadataRoute } from "next";
import { listStages, listCapabilities } from "@/lib/queries/taxonomy";
import { listAllAppSlugs } from "@/lib/queries/apps";
import { listAllVendorSlugs } from "@/lib/queries/vendors";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Priority hierarchy:
  //   1.0  — home (the directory tool itself)
  //   0.7  — landing pages we want indexed at depth (stage, capability)
  //   0.7  — app detail pages (per-product)
  //   0.5  — vendor profiles + secondary public pages
  //   0.3  — legal pages
  const staticPaths: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    ...["/legal/terms", "/legal/privacy", "/legal/vendor-terms", "/legal/cookies"].map(
      (p) => ({
        url: `${SITE_URL}${p}`,
        lastModified: now,
        changeFrequency: "yearly" as const,
        priority: 0.3,
      }),
    ),
  ];

  // DB unreachable at build time → emit just the static paths and let ISR
  // fill in the dynamic ones on the first post-deploy request.
  let stages: { slug: string }[] = [];
  let capabilities: { slug: string }[] = [];
  let appSlugs: string[] = [];
  let vendorSlugs: string[] = [];
  try {
    [stages, capabilities, appSlugs, vendorSlugs] = await Promise.all([
      listStages(),
      listCapabilities(),
      listAllAppSlugs(),
      listAllVendorSlugs(),
    ]);
  } catch (err) {
    console.warn("[sitemap] DB unreachable; emitting static paths only:", err);
  }

  const stagePaths = stages.map((s) => ({
    url: `${SITE_URL}/stages/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const capPaths = capabilities.map((c) => ({
    url: `${SITE_URL}/capabilities/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const appPaths = appSlugs.map((slug) => ({
    url: `${SITE_URL}/apps/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const vendorPaths = vendorSlugs.map((slug) => ({
    url: `${SITE_URL}/vendors/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [
    ...staticPaths,
    ...stagePaths,
    ...capPaths,
    ...appPaths,
    ...vendorPaths,
  ];
}
