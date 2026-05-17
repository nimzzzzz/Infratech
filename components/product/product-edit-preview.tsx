"use client";

import { ProductDetailView } from "@/components/product/product-detail-view";
import {
  capabilities as CAPABILITY_TAXONOMY,
  industries as INDUSTRY_TAXONOMY,
  pricingModels as PRICING_TAXONOMY,
} from "@/lib/data/taxonomy";
import type { AppDetail } from "@/lib/queries/apps";
import type { FormState } from "@/components/dashboard/submit-wizard";

/**
 * Live preview of /apps/[slug] driven by the wizard's current form
 * state. Reuses the shared <ProductDetailView> component so the
 * preview is byte-identical to the real page (zero drift possible —
 * any visual change to the product page automatically flows here).
 *
 * Synthetic AppDetail construction:
 *   - app row fields (id, slug, vendorId, createdAt, status, etc.)
 *     are unchanged — preserved from the live app passed in.
 *   - editable fields (name, tagline, description, logo, video,
 *     website, gallery, taxonomy slugs) come from form state.
 *   - vendor block + vendorRegionSlugs are unchanged — a product
 *     edit can't change those, so we preserve the live values.
 *   - taxonomy slugs are resolved to {slug,name} pairs using the
 *     static taxonomy lookups so the view can render names without
 *     a server round-trip.
 *
 * Related Apps + JsonLd are intentionally skipped per spec —
 * related is passed as [] (the view conditionally renders the
 * section), and JsonLd lives only on the real page.
 */
export function ProductEditPreview({
  liveApp,
  form,
  allStages,
}: {
  liveApp: AppDetail;
  form: FormState;
  allStages: { slug: string; name: string }[];
}) {
  const stagesByName = new Map(allStages.map((s) => [s.slug, s.name]));
  const capByName = new Map(
    CAPABILITY_TAXONOMY.map((c) => [c.slug, c.name]),
  );
  const indByName = new Map(INDUSTRY_TAXONOMY.map((i) => [i.slug, i.name]));
  const pricingByName = new Map(
    PRICING_TAXONOMY.map((p) => [p.slug, p.name]),
  );

  const previewApp: AppDetail = {
    ...liveApp,
    name: form.name || liveApp.name,
    tagline: form.tagline || liveApp.tagline,
    description: form.description || liveApp.description,
    logoUrl: form.productLogoUrl,
    websiteUrl: form.url || liveApp.websiteUrl,
    videoUrl: form.videoUrl || null,
    stages: form.stages.map((slug) => ({
      slug,
      name: stagesByName.get(slug) ?? slug,
    })),
    capabilities: form.capabilities.map((slug) => ({
      slug,
      name: capByName.get(slug) ?? slug,
    })),
    industries: form.industries.map((slug) => ({
      slug,
      name: indByName.get(slug) ?? slug,
    })),
    pricingModels: form.pricingModels.map((slug) => ({
      slug,
      name: pricingByName.get(slug) ?? slug,
    })),
    screenshots: form.productGallery.map((g, idx) => ({
      // Synthetic ids — never persisted, only used as React keys.
      id: -(idx + 1),
      appId: liveApp.id,
      url: g.url,
      alt: g.alt,
      position: g.position,
      createdAt: new Date(),
    })),
  };

  // Scale-to-fit: the shared <ProductDetailView> is designed for the
  // full-width product page (~1280px container). The preview pane in
  // the edit page is roughly half that, so the inner layout would
  // cramp (Lifecycle's 6-col ribbon wraps, hero columns go height-
  // imbalanced which produces a stray border-b under "Contact vendor",
  // etc.). CSS zoom shrinks the rendered output AND the layout box,
  // so the inner thinks it's still at full viewport width and reaches
  // its proper md:/lg: breakpoints — the visual result is just a
  // faithful miniature. Applied only at lg+ where the side-by-side
  // layout activates; mobile/tablet stack the pane full-width below
  // the form, where unscaled native sizing is correct.
  return (
    <div className="lg:[zoom:0.6]">
      <ProductDetailView app={previewApp} related={[]} allStages={allStages} />
    </div>
  );
}
