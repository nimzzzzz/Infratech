import type { MetadataRoute } from "next";
import { listStages, listCapabilities } from "@/lib/queries/taxonomy";
import { listAllAppSlugs } from "@/lib/queries/apps";
import { listAllVendorSlugs } from "@/lib/queries/vendors";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

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
