"use client";

import { useState } from "react";
import { CheckCircle, Clock, XCircle } from "@phosphor-icons/react";
import { SubmitWizard, type FormState } from "@/components/dashboard/submit-wizard";
import { ProductEditPreview } from "@/components/product/product-edit-preview";
import { appToFormState } from "@/lib/products/app-to-form-state";
import type { AppDetail } from "@/lib/queries/apps";
import type { ProductEditStatus } from "@/lib/queries/product-edit";

/**
 * Product edit page — vendor-facing. Three states, mirroring the
 * company edit form:
 *
 *   editable        → wizard mounted, preview live, "Submit edit" CTA
 *   pending_review  → amber "under review" banner, wizard NOT mounted
 *                     (no duplicate submission), preview rendered
 *                     from the pending payload so the vendor can see
 *                     what's awaiting review
 *   rejected        → rose "edit not approved" banner with reason,
 *                     wizard mounted and pre-filled from the rejected
 *                     payload, preview live
 *
 * Layout: split-view at lg+ (form left, preview right). Stacks on
 * smaller viewports — preview below the form. The preview reuses
 * <ProductDetailView> so it never drifts from the real /apps/[slug]
 * page; any visual change to the product page flows through.
 */
export function ProductEditPageClient({
  app,
  editStatus,
  allStages,
}: {
  app: AppDetail;
  editStatus: ProductEditStatus;
  allStages: { slug: string; name: string }[];
}) {
  const isPendingReview = editStatus?.status === "pending_review";
  const isRejected = editStatus?.status === "rejected";

  // Pre-fill from rejected payload so the vendor can fix and resubmit;
  // otherwise pre-fill from the live product. Same pattern as the
  // company edit form.
  const initialValues: Partial<FormState> =
    isRejected && editStatus.payload
      ? payloadToFormState(editStatus.payload)
      : appToFormState(app);

  // Live form state for the preview. Seeded with the merged initial
  // values so the preview is faithful on first render (before the
  // wizard's first onStateChange fire).
  const [formState, setFormState] = useState<FormState>(
    mergeFormState(initialValues),
  );
  const [submitted, setSubmitted] = useState(false);

  // ── SUCCESS STATE ─────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle
          size={20}
          weight="fill"
          className="mt-0.5 shrink-0 text-emerald-600"
        />
        <div>
          <p className="font-medium text-emerald-800">
            Edit submitted for review
          </p>
          <p className="mt-1 text-[15px] text-emerald-700">
            The Resolute team will review your changes and publish them
            shortly. You&rsquo;ll see them live on{" "}
            <span className="num">/apps/{app.slug}</span> once approved.
          </p>
        </div>
      </div>
    );
  }

  // ── PENDING STATE — no wizard, preview only ───────────────────────
  if (isPendingReview) {
    const pendingForm = mergeFormState(
      editStatus?.payload
        ? payloadToFormState(editStatus.payload)
        : appToFormState(app),
    );
    return (
      // Single centered column — the pending state has nothing
      // editable to put in a left form column, so collapse the
      // side-by-side layout. Banner stacks on top of the preview
      // box, both clamped to max-w-4xl and centered. The editable
      // and rejected states keep their wide split-view layouts.
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-5">
          <Clock
            size={20}
            weight="fill"
            className="mt-0.5 shrink-0 text-amber-600"
          />
          <div>
            <p className="font-medium text-amber-800">Edit under review</p>
            <p className="mt-1 text-[15px] text-amber-700">
              Your most recent edit to this product is being reviewed by the
              Resolute team. You can&rsquo;t submit another edit until this
              one is processed.
            </p>
          </div>
        </div>
        <div className="border border-[var(--color-line-strong)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-line)] px-5 py-3">
            <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
              Preview of pending edit
            </p>
          </div>
          <ProductEditPreview
            liveApp={app}
            form={pendingForm}
            allStages={allStages}
          />
        </div>
      </div>
    );
  }

  const rejectedBanner =
    isRejected && editStatus ? (
      <div className="mb-8 flex items-start gap-3 border border-rose-200 bg-rose-50 p-5">
        <XCircle
          size={20}
          weight="fill"
          className="mt-0.5 shrink-0 text-rose-500"
        />
        <div>
          <p className="font-medium text-rose-800">Edit not approved</p>
          <p className="mt-1 text-[15px] text-rose-700">
            {editStatus.rejectionReason ??
              "The Resolute team rejected your edit. Please review and resubmit."}
          </p>
          <p className="mt-2 text-[14px] text-rose-600">
            The form below is pre-filled with your rejected submission. Make
            your corrections and submit again.
          </p>
        </div>
      </div>
    ) : null;

  // ── EDITABLE STATE — wizard + live preview side by side ───────────
  return (
    <div>
      {rejectedBanner}
      <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-12">
        <div>
          <SubmitWizard
            prefill={{ vendor: app.vendor.name, domain: "" }}
            skipCompanyStep
            initialValues={initialValues}
            submitUrl={`/api/product-edit/${app.id}`}
            mode="edit"
            onStateChange={setFormState}
          />
        </div>
        <aside>
          <div className="border border-[var(--color-line-strong)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-line)] px-5 py-3">
              <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
                Live preview
              </p>
            </div>
            <ProductEditPreview
              liveApp={app}
              form={formState}
              allStages={allStages}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Merge a Partial<FormState> over the wizard's empty defaults so the
 * preview's first render has every key populated. Keeps the preview
 * code branch-free — it can rely on a fully-shaped FormState.
 */
function mergeFormState(partial: Partial<FormState>): FormState {
  return {
    // Company fields — unused in edit (skipCompanyStep) but the type
    // requires them. Empty defaults match the wizard's initialState.
    companyName: "",
    companyWebsite: "",
    companyFounded: "",
    companyHeadquarters: "",
    companyRegions: [],
    companyDescription: "",
    companyLogoUrl: null,
    companyLogoAlt: "",

    name: "",
    url: "",
    appleAppStoreUrl: "",
    googlePlayUrl: "",
    productLogoUrl: null,
    logoAlt: "",
    tagline: "",
    description: "",
    videoUrl: "",
    productGallery: [],
    stages: [],
    capabilities: [],
    industries: [],
    pricingModels: [],
    customCapabilities: [],
    customIndustries: [],
    customPricing: "",

    ...partial,
  };
}

/**
 * Map a stored product_edit payload back to the wizard's FormState
 * shape for resubmit prefill. Parallel to appToFormState (which maps
 * from the live AppDetail) — same destination, different source.
 */
function payloadToFormState(payload: Record<string, unknown>): Partial<FormState> {
  const str = (k: string): string =>
    typeof payload[k] === "string" ? (payload[k] as string) : "";
  const arr = (k: string): string[] =>
    Array.isArray(payload[k]) &&
    (payload[k] as unknown[]).every((x) => typeof x === "string")
      ? (payload[k] as string[])
      : [];
  const gallery = Array.isArray(payload.productGallery)
    ? (payload.productGallery as Array<{
        url: string;
        alt: string;
        position: number;
      }>)
    : [];
  return {
    name: str("name"),
    url: str("url"),
    appleAppStoreUrl: str("appleAppStoreUrl"),
    googlePlayUrl: str("googlePlayUrl"),
    tagline: str("tagline"),
    description: str("description"),
    productLogoUrl:
      typeof payload.productLogoUrl === "string"
        ? (payload.productLogoUrl as string)
        : null,
    logoAlt: str("productLogoAlt"),
    videoUrl: str("videoUrl"),
    productGallery: gallery,
    stages: arr("stages"),
    capabilities: arr("capabilities"),
    customCapabilities: arr("customCapabilities"),
    industries: arr("industries"),
    customIndustries: arr("customIndustries"),
    pricingModels: arr("pricingModels"),
    customPricing: str("customPricing"),
  };
}
