import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Browse the directory — InfraTechDB";

export default async function Image() {
  return renderOgImage({
    eyebrow: "Browse",
    title: "Every tool, filterable by stage and capability.",
    subtitle: "Search, filter, and sort the full catalogue.",
    footer: "infratechdb / browse",
  });
}
