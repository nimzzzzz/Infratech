import type { MetadataRoute } from "next";
import { stages } from "@/lib/data/stages";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
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

  const stagePaths = stages.map((s) => ({
    url: `${SITE_URL}/stages/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPaths, ...stagePaths];
}
