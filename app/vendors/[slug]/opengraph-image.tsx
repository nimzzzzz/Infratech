import { notFound } from "next/navigation";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";
import { getVendorBySlug } from "@/lib/queries/vendors";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Vendor profile — InfraTechDB";

export default async function Image({
  params,
}: {
  params: { slug: string };
}) {
  const vendor = await getVendorBySlug(params.slug);
  if (!vendor) notFound();
  return renderOgImage({
    eyebrow: "Vendor profile",
    title: vendor.name,
    subtitle: vendor.shortBlurb ?? undefined,
    footer: `infratechdb / vendors / ${vendor.slug}`,
  });
}
