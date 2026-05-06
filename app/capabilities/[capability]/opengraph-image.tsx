import { notFound } from "next/navigation";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";
import { getCapabilityBySlug } from "@/lib/queries/taxonomy";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Capability — InfraTechDB";

export default async function Image({
  params,
}: {
  params: { capability: string };
}) {
  const capability = await getCapabilityBySlug(params.capability);
  if (!capability) notFound();
  return renderOgImage({
    eyebrow: "Capability",
    title: `${capability.name} software.`,
    subtitle: capability.description ?? undefined,
    footer: `infratechdb / capabilities / ${capability.slug}`,
  });
}
