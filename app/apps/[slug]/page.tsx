import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewTracker } from "@/components/directory/view-tracker";
import { ProductDetailView } from "@/components/product/product-detail-view";
import {
  getAppBySlug,
  listAllAppSlugs,
  listRelatedApps,
  type AppDetail,
} from "@/lib/queries/apps";
import { listStages } from "@/lib/queries/taxonomy";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await listAllAppSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (err) {
    // DB unreachable at build time — let ISR populate pages on first request.
    console.warn("[apps/[slug]] generateStaticParams skipped:", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const app = await getAppBySlug(slug);
  if (!app) return { title: "App not found" };
  return {
    title: `${app.name} — ${app.vendor.name}`,
    description: app.tagline ?? undefined,
    alternates: { canonical: `/apps/${app.slug}` },
    openGraph: {
      title: `${app.name} — ${app.vendor.name}`,
      description: app.tagline ?? undefined,
      url: `${SITE_URL}/apps/${app.slug}`,
      type: "website",
    },
  };
}

/**
 * Thin wrapper around <ProductDetailView>. The view is the single
 * source of truth for product-page rendering — the future product
 * edit page's live preview mounts the same view, so any visual
 * change here automatically flows through there.
 *
 * Page-only concerns kept out of the view:
 *   - <JsonLd> needs SITE_URL (the view doesn't take SITE_URL)
 *   - <ViewTracker> is analytics, only the real page fires it
 */
export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = await getAppBySlug(slug);
  if (!app) notFound();

  const [related, allStages] = await Promise.all([
    listRelatedApps(app.id, 3),
    listStages(),
  ]);

  return (
    <article className="bg-[var(--color-canvas)]">
      <JsonLd app={app} />
      <ViewTracker appId={app.id} />
      <ProductDetailView app={app} related={related} allStages={allStages} />
    </article>
  );
}

function JsonLd({ app }: { app: AppDetail }) {
  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.tagline,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/apps/${app.slug}`,
    publisher: {
      "@type": "Organization",
      name: app.vendor.name,
      url: app.vendor.websiteUrl,
    },
    offers:
      app.pricingModels.length > 0
        ? {
            "@type": "Offer",
            url: app.websiteUrl,
            priceSpecification: {
              "@type": "PriceSpecification",
              description: app.pricingModels.map((p) => p.name).join(", "),
            },
          }
        : undefined,
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Index", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: app.vendor.name,
        item: `${SITE_URL}/vendors/${app.vendor.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: app.name,
        item: `${SITE_URL}/apps/${app.slug}`,
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  );
}
