import type { MetadataRoute } from "next";
import { listStages, listCapabilities } from "@/lib/queries/taxonomy";
import { listAllAppSlugs } from "@/lib/queries/apps";
import { listAllVendorSlugs } from "@/lib/queries/vendors";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = [
    "",
    "/about",
    "/suggest",
    "/contact",
    "/legal/terms",
    "/legal/privacy",
    "/legal/vendor-terms",
    "/legal/cookies",
  ].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  const [stages, capabilities, appSlugs, vendorSlugs] = await Promise.all([
    listStages(),
    listCapabilities(),
    listAllAppSlugs(),
    listAllVendorSlugs(),
  ]);

  const stagePaths = stages.map((s) => ({
    url: `${SITE_URL}/stages/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const capPaths = capabilities.map((c) => ({
    url: `${SITE_URL}/capabilities/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const appPaths = appSlugs.map((slug) => ({
    url: `${SITE_URL}/apps/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
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
