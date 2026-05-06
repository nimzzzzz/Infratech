import { notFound } from "next/navigation";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";
import { getAppBySlug } from "@/lib/queries/apps";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Project tool — InfraTechDB";

export default async function Image({
  params,
}: {
  params: { slug: string };
}) {
  const app = await getAppBySlug(params.slug);
  if (!app) notFound();
  return renderOgImage({
    eyebrow: app.vendor.name,
    title: app.name,
    subtitle: app.tagline ?? undefined,
    footer: `infratechdb / apps / ${app.slug}`,
  });
}
