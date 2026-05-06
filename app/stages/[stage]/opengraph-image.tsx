import { notFound } from "next/navigation";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";
import { getStageBySlug } from "@/lib/queries/taxonomy";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Project lifecycle stage — InfraTechDB";

export default async function Image({
  params,
}: {
  params: { stage: string };
}) {
  const stage = await getStageBySlug(params.stage);
  if (!stage) notFound();
  return renderOgImage({
    eyebrow: `Stage ${String(stage.position + 1).padStart(2, "0")}`,
    title: `${stage.name} software.`,
    subtitle: stage.shortDescription ?? undefined,
    footer: `infratechdb / stages / ${stage.slug}`,
  });
}
