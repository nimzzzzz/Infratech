import type { AppDetail } from "@/lib/queries/apps";
import type { FormState } from "@/components/dashboard/submit-wizard";

/**
 * Convert a published product's AppDetail into the wizard's
 * Partial<FormState> shape so the product edit page can pre-fill the
 * wizard with the live values. Parallel to payloadToWizardValues
 * (used by the rejected-submission resubmit flow) — different source,
 * same destination shape.
 *
 * Custom taxonomy arrays (customCapabilities/customIndustries/
 * customPricing) start empty: a published product has only canonical
 * taxonomy joins on disk; any "proposed" tags from the original
 * submission were either promoted to canonical or discarded at
 * publish time. The vendor is free to propose new custom tags during
 * the edit — they'll land in the product_edit submission's payload
 * for admin review.
 *
 * logoAlt also starts empty — alt text isn't persisted on the apps
 * row (only on app_screenshots). The vendor re-enters it only if
 * they're changing the logo. (Tracked separately if it surfaces as
 * a UX gap.)
 */
export function appToFormState(app: AppDetail): Partial<FormState> {
  return {
    name: app.name,
    url: app.websiteUrl,
    appleAppStoreUrl: app.appleAppStoreUrl ?? "",
    googlePlayUrl: app.googlePlayUrl ?? "",
    productLogoUrl: app.logoUrl,
    logoAlt: "",
    tagline: app.tagline ?? "",
    description: app.description ?? "",
    videoUrl: app.videoUrl ?? "",
    productGallery: app.screenshots.map((s) => ({
      url: s.url,
      alt: s.alt,
      position: s.position,
    })),
    stages: app.stages.map((s) => s.slug),
    capabilities: app.capabilities.map((c) => c.slug),
    customCapabilities: [],
    industries: app.industries.map((i) => i.slug),
    customIndustries: [],
    pricingModels: app.pricingModels.map((p) => p.slug),
    customPricing: "",
  };
}
