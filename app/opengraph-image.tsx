import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "InfraTechDB — the index of project products";

export default async function Image() {
  return renderOgImage({
    eyebrow: "The directory",
    title: "Find the right tool for every stage of your project.",
    subtitle:
      "An independent reference of project management and infrastructure software.",
    footer: "infratechdb",
  });
}
