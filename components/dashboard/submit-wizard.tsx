"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  PaperPlaneTilt,
  Plus,
  X,
} from "@phosphor-icons/react";
import { stages } from "@/lib/data/stages";
import {
  capabilities,
  industries,
  pricingModels,
  regions,
} from "@/lib/data/taxonomy";
import { cn } from "@/lib/utils";
import { CountrySelect } from "./country-select";
import { LogoUpload } from "./logo-upload";

const CUSTOM_PRICING_SLUG = "__custom__";

type CustomKey = "capabilities" | "industries";

type FormState = {
  // ── Company-level ── (skipped in real flow if vendor profile already exists)
  companyName: string;
  companyWebsite: string;
  companyFounded: string;
  companyHeadquarters: string;
  companyRegions: string[];
  companyDescription: string;
  companyLogoFile: File | null;
  companyLogoAlt: string;

  // ── Tool-level ──
  name: string;
  url: string;
  logoFile: File | null;
  logoAlt: string;
  tagline: string;
  description: string;
  stages: string[];
  capabilities: string[];
  industries: string[];
  pricing: string;
  customCapabilities: string[];
  customIndustries: string[];
  customPricing: string;
};

const initialState = (companyName: string, domain: string): FormState => ({
  companyName,
  companyWebsite: domain ? `https://${domain}` : "",
  companyFounded: "",
  companyHeadquarters: "",
  companyRegions: [],
  companyDescription: "",
  companyLogoFile: null,
  companyLogoAlt: "",

  name: "",
  url: "",
  logoFile: null,
  logoAlt: "",
  tagline: "",
  description: "",
  stages: [],
  capabilities: [],
  industries: [],
  pricing: "",
  customCapabilities: [],
  customIndustries: [],
  customPricing: "",
});

const steps = [
  { n: 1, label: "Your company", scope: "company" as const },
  { n: 2, label: "Product details", scope: "tool" as const },
  { n: 3, label: "Review", scope: "review" as const },
];

const TOTAL_STEPS = steps.length;

export function SubmitWizard({
  prefill,
  skipCompanyStep = false,
}: {
  prefill: { vendor: string; domain: string };
  /** Returning vendors already have a published company profile — start at
   *  step 2 (Tool basics) and lock back-navigation out of the company step. */
  skipCompanyStep?: boolean;
}) {
  const router = useRouter();
  const minStep = skipCompanyStep ? 2 : 1;
  const [step, setStep] = useState(minStep);
  const [data, setData] = useState<FormState>(
    initialState(prefill.vendor, prefill.domain),
  );
  const [submitting, setSubmitting] = useState(false);
  // Where to scroll on the next step change. Reset after each effect run.
  const scrollTargetRef = useRef<string | null>(null);
  // Suppress browser-back popstate handling once after we sync state from it.
  const skipPopRef = useRef(false);

  // Take over scroll restoration while the wizard is mounted — the browser's
  // default behavior would restore the bottom-of-page scroll position from
  // wherever you clicked Continue, fighting with our scroll-to-top.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = prev;
    };
  }, []);

  // Push a history entry per step so the browser Back button steps back
  // through the wizard instead of navigating to the page we came from.
  // We tag entries with { wizardStep } so popstate can restore the right step.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (skipPopRef.current) {
      skipPopRef.current = false;
      return;
    }
    const current = window.history.state as { wizardStep?: number } | null;
    if (current?.wizardStep === step) return;
    if (current?.wizardStep == null) {
      window.history.replaceState({ wizardStep: step }, "");
    } else {
      window.history.pushState({ wizardStep: step }, "");
    }
  }, [step]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = (e: PopStateEvent) => {
      const next = (e.state as { wizardStep?: number } | null)?.wizardStep;
      if (typeof next === "number" && next >= minStep && next <= TOTAL_STEPS) {
        skipPopRef.current = true;
        setStep(next);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [minStep]);

  // Scroll to top (or a specific section) AFTER the new step has rendered.
  // useLayoutEffect runs synchronously after DOM commit and before paint, so
  // the user never sees a flash of the wrong scroll position.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const target = scrollTargetRef.current;
    scrollTargetRef.current = null;
    if (target) {
      document.getElementById(target)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [step]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const toggle = (
    key: "stages" | "capabilities" | "industries" | "companyRegions",
    slug: string,
  ) =>
    setData((d) => ({
      ...d,
      [key]: d[key].includes(slug)
        ? d[key].filter((s) => s !== slug)
        : [...d[key], slug],
    }));

  const customKeyOf = (k: CustomKey): "customCapabilities" | "customIndustries" =>
    k === "capabilities" ? "customCapabilities" : "customIndustries";

  const addCustom = (key: CustomKey, value: string) =>
    setData((d) => ({
      ...d,
      [customKeyOf(key)]: [...d[customKeyOf(key)], value],
    }));

  const removeCustom = (key: CustomKey, value: string) =>
    setData((d) => ({
      ...d,
      [customKeyOf(key)]: d[customKeyOf(key)].filter((v) => v !== value),
    }));

  const pricingValid = (): boolean => {
    if (data.pricing === CUSTOM_PRICING_SLUG)
      return data.customPricing.trim().length > 0;
    return Boolean(data.pricing);
  };

  const stepValid = (): boolean => {
    if (step === 1) {
      const baseOk = Boolean(
        data.companyName &&
          data.companyWebsite &&
          data.companyFounded &&
          data.companyHeadquarters &&
          data.companyRegions.length > 0 &&
          data.companyDescription,
      );
      const logoOk =
        !data.companyLogoFile || data.companyLogoAlt.trim().length > 0;
      return baseOk && logoOk;
    }
    if (step === 2) {
      const basicsOk =
        Boolean(data.name && data.url) &&
        (!data.logoFile || data.logoAlt.trim().length > 0);
      const descOk = Boolean(data.tagline && data.description);
      const taxonomyOk =
        data.stages.length > 0 &&
        (data.capabilities.length > 0 || data.customCapabilities.length > 0);
      const industryPricingOk =
        (data.industries.length > 0 || data.customIndustries.length > 0) &&
        pricingValid();
      return basicsOk && descOk && taxonomyOk && industryPricingOk;
    }
    return true;
  };

  const next = () => {
    if (!stepValid()) return;
    scrollTargetRef.current = null;
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const prev = () => {
    scrollTargetRef.current = null;
    setStep((s) => Math.max(minStep, s - 1));
  };

  const jumpToStep = (targetStep: number, sectionId?: string) => {
    scrollTargetRef.current = sectionId ?? null;
    setStep(targetStep);
  };

  const handleSubmit = () => {
    setSubmitting(true);
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[mock submission]", data);
    }
    // Returning vendors land back on their dashboard; first-time vendors see
    // the onboarding "thanks, we'll review" page since this is their first
    // submission and they haven't seen the dashboard yet.
    const target = skipCompanyStep
      ? "/dashboard?submitted=1"
      : "/dashboard/onboarding/complete";
    setTimeout(() => router.push(target), 400);
  };

  // Returning vendors already have a company profile — render the entire
  // submission as one scrollable page, then a separate review summary.
  if (skipCompanyStep) {
    return (
      <SinglePageSubmit
        data={data}
        update={update}
        toggle={toggle}
        addCustom={addCustom}
        removeCustom={removeCustom}
        pricingValid={pricingValid}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <div className="mt-8">
      <ProgressRail step={step} skipCompanyStep={skipCompanyStep} />

      <div className="mt-10">
        {step === 1 ? (
          <CompanyStep data={data} update={update} toggle={toggle} />
        ) : null}
        {step === 2 ? (
          <div className="space-y-14">
            <div id="section-basics" className="scroll-mt-24">
              <Section title="Product basics" n={1}>
                <ToolBasicsStep data={data} update={update} />
              </Section>
            </div>
            <div id="section-description" className="scroll-mt-24">
              <Section title="Product description" n={2}>
                <ToolDescStep data={data} update={update} />
              </Section>
            </div>
            <div id="section-taxonomy" className="scroll-mt-24">
              <Section title="Stages & capabilities" n={3}>
                <TaxonomyStep
                  data={data}
                  toggle={toggle}
                  addCustom={addCustom}
                  removeCustom={removeCustom}
                />
              </Section>
            </div>
            <div id="section-industries" className="scroll-mt-24">
              <Section title="Industries & pricing" n={4}>
                <IndustryPricingStep
                  data={data}
                  toggle={toggle}
                  update={update}
                  addCustom={addCustom}
                  removeCustom={removeCustom}
                />
              </Section>
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <FullReviewView
            data={data}
            onEditCompany={() => jumpToStep(1)}
            onEditSection={(sectionId) => jumpToStep(2, sectionId)}
          />
        ) : null}
      </div>

      {/* navigation */}
      <div className="mt-12 flex items-center justify-between border-t border-[var(--color-line)] pt-6">
        <button
          type="button"
          onClick={prev}
          disabled={step === minStep}
          className={cn(
            "group inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.18em] transition-colors",
            step === minStep
              ? "cursor-not-allowed text-[var(--color-ink-3)]/50"
              : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
          )}
        >
          <ArrowLeft
            size={12}
            weight="bold"
            className="transition-transform duration-300 group-hover:-translate-x-0.5"
          />
          Back
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={next}
            disabled={!stepValid()}
            className={cn(
              "group inline-flex h-11 items-center gap-2 px-5 text-[12px] font-medium uppercase tracking-[0.2em] transition active:translate-y-[1px]",
              stepValid()
                ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
                : "cursor-not-allowed bg-[var(--color-line)] text-[var(--color-ink-3)]",
            )}
          >
            Continue
            <ArrowRight
              size={13}
              weight="bold"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={cn(
              "group inline-flex h-11 items-center gap-2 px-5 text-[12px] font-medium uppercase tracking-[0.2em] text-white transition active:translate-y-[1px]",
              submitting ? "bg-[var(--color-coral)]/80" : "bloom",
            )}
          >
            {submitting ? (
              <>
                <Check size={13} weight="bold" />
                Submitting…
              </>
            ) : (
              <>
                <PaperPlaneTilt size={13} weight="regular" />
                Submit for publishing
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressRail({
  step,
  skipCompanyStep,
}: {
  step: number;
  skipCompanyStep: boolean;
}) {
  const headlineFor = (n: number): string => {
    switch (n) {
      case 1: return "First, about your company.";
      case 2: return "Now, the product itself.";
      default: return "Look it over before submitting.";
    }
  };

  // Visible steps: skip the company step when returning vendor.
  const visibleSteps = skipCompanyStep ? steps.slice(1) : steps;
  const totalVisible = visibleSteps.length;
  const displayIndex = skipCompanyStep ? step - 1 : step;
  const eyebrowLabel = skipCompanyStep ? "Add a product" : "New listing";

  return (
    <div>
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        {eyebrowLabel} &middot; Step{" "}
        <span className="num">{String(displayIndex).padStart(2, "0")}</span>{" "}
        of{" "}
        <span className="num">{String(totalVisible).padStart(2, "0")}</span>{" "}
        &middot; {steps[step - 1].label}
      </p>
      <h1 className="mt-4 font-heading text-[34px] leading-[1.04] tracking-tight md:text-[44px]">
        {headlineFor(step)}
      </h1>
      <div
        className="mt-7 grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${totalVisible}, minmax(0, 1fr))`,
        }}
      >
        {visibleSteps.map((s) => (
          <span
            key={s.n}
            className={cn(
              "h-1 transition-colors",
              s.n < step
                ? "bg-[var(--color-coral)]"
                : s.n === step
                  ? "bloom"
                  : "bg-[var(--color-line-strong)]",
            )}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

function FullReviewView({
  data,
  onEditCompany,
  onEditSection,
}: {
  data: FormState;
  onEditCompany: () => void;
  onEditSection: (sectionId: string) => void;
}) {
  return (
    <div className="space-y-8 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
      <ReviewBlock title="Your company" onEdit={onEditCompany}>
        <ReviewRow label="Name" value={data.companyName} />
        <ReviewRow label="Website" value={data.companyWebsite} />
        <ReviewRow label="Founded" value={data.companyFounded} />
        <ReviewRow label="HQ country" value={data.companyHeadquarters} />
        <ReviewRow
          label="Regions"
          value={data.companyRegions
            .map((s) => regions.find((r) => r.slug === s)?.name ?? s)
            .join(", ")}
        />
        <ReviewRow
          label="Description"
          value={data.companyDescription}
          multiline
        />
        {data.companyLogoFile ? (
          <ReviewLogo
            label="Company logo"
            file={data.companyLogoFile}
            alt={data.companyLogoAlt}
          />
        ) : null}
      </ReviewBlock>

      <ReviewBlock
        title="Product basics"
        onEdit={() => onEditSection("section-basics")}
      >
        <ReviewRow label="Product" value={data.name} />
        <ReviewRow label="Website" value={data.url} />
        {data.logoFile ? (
          <ReviewLogo
            label="Product logo"
            file={data.logoFile}
            alt={data.logoAlt}
          />
        ) : null}
      </ReviewBlock>

      <ReviewBlock
        title="Product description"
        onEdit={() => onEditSection("section-description")}
      >
        <ReviewRow label="Tagline" value={data.tagline} />
        <ReviewRow label="What it does" value={data.description} multiline />
      </ReviewBlock>

      <ReviewBlock
        title="Stages & capabilities"
        onEdit={() => onEditSection("section-taxonomy")}
      >
        <ReviewRow
          label="Stages"
          value={data.stages
            .map((s) => stages.find((x) => x.slug === s)?.name ?? s)
            .join(", ")}
        />
        <ReviewTaxonomyRow
          label="Capabilities"
          canonical={data.capabilities.map(
            (c) => capabilities.find((x) => x.slug === c)?.name ?? c,
          )}
          proposed={data.customCapabilities}
        />
      </ReviewBlock>

      <ReviewBlock
        title="Industries & pricing"
        onEdit={() => onEditSection("section-industries")}
      >
        <ReviewTaxonomyRow
          label="Industries"
          canonical={data.industries.map(
            (i) => industries.find((x) => x.slug === i)?.name ?? i,
          )}
          proposed={data.customIndustries}
        />
        <ReviewRow
          label="Pricing"
          value={
            data.pricing === CUSTOM_PRICING_SLUG
              ? `${data.customPricing} (proposed)`
              : pricingModels.find((p) => p.slug === data.pricing)?.name ?? ""
          }
        />
      </ReviewBlock>
    </div>
  );
}

function SinglePageSubmit({
  data,
  update,
  toggle,
  addCustom,
  removeCustom,
  pricingValid,
  submitting,
  onSubmit,
}: {
  data: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  toggle: (
    key: "stages" | "capabilities" | "industries",
    slug: string,
  ) => void;
  addCustom: (key: CustomKey, value: string) => void;
  removeCustom: (key: CustomKey, value: string) => void;
  pricingValid: () => boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const [view, setView] = useState<"edit" | "review">("edit");
  const scrollTargetRef = useRef<string | null>(null);

  const basicsOk =
    Boolean(data.name && data.url) &&
    (!data.logoFile || data.logoAlt.trim().length > 0);
  const descOk = Boolean(data.tagline && data.description);
  const taxonomyOk =
    data.stages.length > 0 &&
    (data.capabilities.length > 0 || data.customCapabilities.length > 0);
  const industryPricingOk =
    (data.industries.length > 0 || data.customIndustries.length > 0) &&
    pricingValid();
  const allValid = basicsOk && descOk && taxonomyOk && industryPricingOk;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const target = scrollTargetRef.current;
    scrollTargetRef.current = null;
    if (target) {
      document.getElementById(target)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [view]);

  const editAt = (sectionId: string) => {
    scrollTargetRef.current = sectionId;
    setView("edit");
  };

  if (view === "review") {
    return (
      <div className="mt-8">
        <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
          Add a product &middot; Review
        </p>
        <h1 className="mt-4 font-heading text-[34px] leading-[1.04] tracking-tight md:text-[44px]">
          Look it over before submitting.
        </h1>
        <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ink-2)] md:text-[15px]">
          Edit any block to jump back. Editorial review usually takes two
          business days &mdash; we&rsquo;ll email you when it&rsquo;s live.
        </p>

        <div className="mt-10 space-y-8 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
          <ReviewBlock
            title="Product basics"
            onEdit={() => editAt("section-basics")}
          >
            <ReviewRow label="Product" value={data.name} />
            <ReviewRow label="Website" value={data.url} />
            {data.logoFile ? (
              <ReviewLogo
                label="Product logo"
                file={data.logoFile}
                alt={data.logoAlt}
              />
            ) : null}
          </ReviewBlock>

          <ReviewBlock
            title="Product description"
            onEdit={() => editAt("section-description")}
          >
            <ReviewRow label="Tagline" value={data.tagline} />
            <ReviewRow
              label="What it does"
              value={data.description}
              multiline
            />
          </ReviewBlock>

          <ReviewBlock
            title="Stages & capabilities"
            onEdit={() => editAt("section-taxonomy")}
          >
            <ReviewRow
              label="Stages"
              value={data.stages
                .map((s) => stages.find((x) => x.slug === s)?.name ?? s)
                .join(", ")}
            />
            <ReviewTaxonomyRow
              label="Capabilities"
              canonical={data.capabilities.map(
                (c) => capabilities.find((x) => x.slug === c)?.name ?? c,
              )}
              proposed={data.customCapabilities}
            />
          </ReviewBlock>

          <ReviewBlock
            title="Industries & pricing"
            onEdit={() => editAt("section-industries")}
          >
            <ReviewTaxonomyRow
              label="Industries"
              canonical={data.industries.map(
                (i) => industries.find((x) => x.slug === i)?.name ?? i,
              )}
              proposed={data.customIndustries}
            />
            <ReviewRow
              label="Pricing"
              value={
                data.pricing === CUSTOM_PRICING_SLUG
                  ? `${data.customPricing} (proposed)`
                  : pricingModels.find((p) => p.slug === data.pricing)?.name ??
                    ""
              }
            />
          </ReviewBlock>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-[var(--color-line)] pt-6">
          <button
            type="button"
            onClick={() => {
              scrollTargetRef.current = null;
              setView("edit");
            }}
            className="group inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
          >
            <ArrowLeft
              size={12}
              weight="bold"
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            />
            Back to edit
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={cn(
              "group inline-flex h-12 items-center justify-center gap-2 px-6 text-[12px] font-medium uppercase tracking-[0.2em] text-white transition active:translate-y-[1px]",
              submitting ? "bg-[var(--color-coral)]/80" : "bloom",
            )}
          >
            {submitting ? (
              <>
                <Check size={13} weight="bold" />
                Submitting…
              </>
            ) : (
              <>
                <PaperPlaneTilt size={13} weight="regular" />
                Submit for publishing
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Add a product
      </p>
      <h1 className="mt-4 font-heading text-[34px] leading-[1.04] tracking-tight md:text-[44px]">
        Tell us about the new product.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ink-2)] md:text-[15px]">
        Fill everything in on this page, then review before submitting.
        Editorial review usually takes two business days.
      </p>

      <div className="mt-12 space-y-14">
        <div id="section-basics" className="scroll-mt-24">
          <Section title="Product basics" n={1}>
            <ToolBasicsStep data={data} update={update} />
          </Section>
        </div>
        <div id="section-description" className="scroll-mt-24">
          <Section title="Product description" n={2}>
            <ToolDescStep data={data} update={update} />
          </Section>
        </div>
        <div id="section-taxonomy" className="scroll-mt-24">
          <Section title="Stages & capabilities" n={3}>
            <TaxonomyStep
              data={data}
              toggle={toggle}
              addCustom={addCustom}
              removeCustom={removeCustom}
            />
          </Section>
        </div>
        <div id="section-industries" className="scroll-mt-24">
          <Section title="Industries & pricing" n={4}>
            <IndustryPricingStep
              data={data}
              toggle={toggle}
              update={update}
              addCustom={addCustom}
              removeCustom={removeCustom}
            />
          </Section>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-[var(--color-ink-3)]">
          {allValid
            ? "All set. Continue to review your submission."
            : "Fill the required fields above to continue."}
        </p>
        <button
          type="button"
          onClick={() => {
            scrollTargetRef.current = null;
            setView("review");
          }}
          disabled={!allValid}
          className={cn(
            "group inline-flex h-12 items-center justify-center gap-2 px-6 text-[12px] font-medium uppercase tracking-[0.2em] transition active:translate-y-[1px]",
            allValid
              ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
              : "cursor-not-allowed bg-[var(--color-line)] text-[var(--color-ink-3)]",
          )}
        >
          Continue to review
          <ArrowRight
            size={13}
            weight="bold"
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  n,
  children,
}: {
  title: string;
  n: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="flex items-baseline gap-3 border-b border-[var(--color-line-strong)] pb-3">
        <span className="num text-[11px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
          {String(n).padStart(2, "0")}
        </span>
        <h2 className="font-heading text-[22px] leading-tight tracking-tight md:text-[26px]">
          {title}
        </h2>
      </header>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]"
      >
        {label}
        {required ? <span className="text-[var(--color-magenta)]"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p className="text-[12px] text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}

const inputCls =
  "h-11 w-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none";

// ──────────────────────────────────────────────────────────────────────
// STEP 1 — Your company
// (Real flow: skipped if the vendor already has a published profile)
// ──────────────────────────────────────────────────────────────────────

function CompanyStep({
  data,
  update,
  toggle,
}: {
  data: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  toggle: (
    key: "stages" | "capabilities" | "industries" | "companyRegions",
    slug: string,
  ) => void;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <p className="md:col-span-2 -mt-2 text-[13px] leading-relaxed text-[var(--color-ink-2)]">
        This step builds your company&rsquo;s public profile at{" "}
        <code className="rounded bg-[var(--color-canvas-warm)] px-1.5 py-0.5 text-[12px] text-[var(--color-ink)]">
          stagecraft/vendors/your-company
        </code>
        . You&rsquo;ll only see this step once &mdash; future product submissions
        skip straight to the product details.
      </p>

      <div className="md:col-span-2">
        <Field
          label="Company name"
          htmlFor="companyName"
          required
          hint="Pre-filled from LinkedIn — edit if it should display differently."
        >
          <input
            id="companyName"
            type="text"
            value={data.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Company website" htmlFor="companyWebsite" required>
        <input
          id="companyWebsite"
          type="url"
          value={data.companyWebsite}
          onChange={(e) => update("companyWebsite", e.target.value)}
          placeholder="https://"
          className={inputCls}
        />
      </Field>
      <Field label="Year founded" htmlFor="companyFounded" required>
        <input
          id="companyFounded"
          type="number"
          inputMode="numeric"
          value={data.companyFounded}
          onChange={(e) => update("companyFounded", e.target.value)}
          placeholder="e.g. 2017"
          min={1900}
          max={new Date().getFullYear()}
          className={cn(inputCls, "num")}
        />
      </Field>

      <Field
        label="Headquarters country"
        htmlFor="companyHeadquarters"
        required
        hint="Where the company is legally based."
      >
        <CountrySelect
          id="companyHeadquarters"
          value={data.companyHeadquarters}
          onChange={(v) => update("companyHeadquarters", v)}
        />
      </Field>

      <div className="md:col-span-2">
        <ChipGroup
          label="Regions you operate in"
          required
          hint="Pick every region where the company actively serves customers. Choose Global if you serve worldwide."
          options={regions}
          selected={data.companyRegions}
          onToggle={(slug) => toggle("companyRegions", slug)}
        />
      </div>

      <div className="md:col-span-2">
        <Field
          label="Company description"
          htmlFor="companyDescription"
          required
          hint="Two short paragraphs at most. What the company does, who it's for, founding context. Plain English — no marketing language."
        >
          <textarea
            id="companyDescription"
            rows={6}
            value={data.companyDescription}
            onChange={(e) => update("companyDescription", e.target.value)}
            placeholder="What does the company actually build? What's the founding story or distinctive angle?"
            maxLength={1500}
            className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
          />
          <p className="text-[11px] text-[var(--color-ink-3)]">
            <span className="num">{data.companyDescription.length}</span> /{" "}
            <span className="num">1500</span>
          </p>
        </Field>
      </div>

      <LogoUpload
        file={data.companyLogoFile}
        alt={data.companyLogoAlt}
        onFileChange={(f) => update("companyLogoFile", f)}
        onAltChange={(v) => update("companyLogoAlt", v)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// STEP 2 — Tool basics
// ──────────────────────────────────────────────────────────────────────

function ToolBasicsStep({
  data,
  update,
}: {
  data: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="Product name" htmlFor="name" required>
          <input
            id="name"
            type="text"
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Northstrand Field"
            className={inputCls}
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Product website" htmlFor="url" required>
          <input
            id="url"
            type="url"
            value={data.url}
            onChange={(e) => update("url", e.target.value)}
            placeholder="https://"
            className={inputCls}
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
          Product logo{" "}
          <span className="normal-case tracking-normal text-[var(--color-ink-3)]">
            (optional &mdash; overrides the company logo on this listing only)
          </span>
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-ink-3)]">
          Skip if your product uses the same brand mark as the company.
        </p>
        <div className="mt-2">
          <LogoUpload
            file={data.logoFile}
            alt={data.logoAlt}
            onFileChange={(f) => update("logoFile", f)}
            onAltChange={(v) => update("logoAlt", v)}
          />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// STEP 3 — Tool description
// ──────────────────────────────────────────────────────────────────────

function ToolDescStep({
  data,
  update,
}: {
  data: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Field
        label="Tagline"
        htmlFor="tagline"
        required
        hint="One sentence, plain English. Describe the product, not the company. Avoid 'elevate', 'seamless', 'next-gen'."
      >
        <input
          id="tagline"
          type="text"
          value={data.tagline}
          onChange={(e) => update("tagline", e.target.value)}
          placeholder="e.g. Schedule risk analysis trained on completed projects."
          maxLength={140}
          className={inputCls}
        />
        <p className="text-[11px] text-[var(--color-ink-3)]">
          <span className="num">{data.tagline.length}</span> /{" "}
          <span className="num">140</span>
        </p>
      </Field>

      <Field
        label="What the product does"
        htmlFor="description"
        required
        hint="Two short paragraphs at most. Product capabilities and where it fits — not company background. Editorial team may copy-edit before publishing."
      >
        <textarea
          id="description"
          rows={6}
          value={data.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What does the product actually do? What's distinctive? Skip the marketing language."
          maxLength={1200}
          className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
        />
        <p className="text-[11px] text-[var(--color-ink-3)]">
          <span className="num">{data.description.length}</span> /{" "}
          <span className="num">1200</span>
        </p>
      </Field>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// STEP 4 — Stages & Capabilities
// ──────────────────────────────────────────────────────────────────────

function TaxonomyStep({
  data,
  toggle,
  addCustom,
  removeCustom,
}: {
  data: FormState;
  toggle: (
    key: "stages" | "capabilities" | "industries",
    slug: string,
  ) => void;
  addCustom: (key: CustomKey, value: string) => void;
  removeCustom: (key: CustomKey, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      <ChipGroup
        label="Project stages"
        required
        hint="Pick every stage your product actively supports. Stages are the directory's primary axis and aren't open for new proposals."
        options={stages.map((s) => ({ slug: s.slug, name: s.name }))}
        selected={data.stages}
        onToggle={(slug) => toggle("stages", slug)}
      />
      <ChipGroup
        label="Capabilities"
        required
        hint="What the product actually does. Pick up to five for clarity. Don't see one? Suggest it — admins review proposed tags before they go live."
        options={capabilities}
        selected={data.capabilities}
        onToggle={(slug) => toggle("capabilities", slug)}
        customSelected={data.customCapabilities}
        onAddCustom={(v) => addCustom("capabilities", v)}
        onRemoveCustom={(v) => removeCustom("capabilities", v)}
        scrollable
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// STEP 5 — Industries & Pricing
// ──────────────────────────────────────────────────────────────────────

function IndustryPricingStep({
  data,
  toggle,
  update,
  addCustom,
  removeCustom,
}: {
  data: FormState;
  toggle: (
    key: "stages" | "capabilities" | "industries",
    slug: string,
  ) => void;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  addCustom: (key: CustomKey, value: string) => void;
  removeCustom: (key: CustomKey, value: string) => void;
}) {
  const customSelected = data.pricing === CUSTOM_PRICING_SLUG;
  return (
    <div className="flex flex-col gap-10">
      <ChipGroup
        label="Industries"
        required
        hint="Don't see your industry? Suggest one — admins review before it joins the canonical list."
        options={industries}
        selected={data.industries}
        onToggle={(slug) => toggle("industries", slug)}
        customSelected={data.customIndustries}
        onAddCustom={(v) => addCustom("industries", v)}
        onRemoveCustom={(v) => removeCustom("industries", v)}
      />

      <div>
        <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
          Pricing model <span className="text-[var(--color-magenta)]">*</span>
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-ink-3)]">
          One that best describes how customers buy. We don&rsquo;t display
          actual prices. Pick &ldquo;Other&rdquo; if none of these fit.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {pricingModels.map((p) => {
            const checked = data.pricing === p.slug;
            return (
              <li key={p.slug}>
                <PricingCard
                  checked={checked}
                  label={p.name}
                  onClick={() => update("pricing", p.slug)}
                />
              </li>
            );
          })}
          <li>
            <PricingCard
              checked={customSelected}
              label={
                customSelected && data.customPricing
                  ? data.customPricing
                  : "Other (describe)"
              }
              proposed
              onClick={() => update("pricing", CUSTOM_PRICING_SLUG)}
            />
          </li>
        </ul>

        {customSelected ? (
          <div className="mt-4">
            <label
              htmlFor="customPricing"
              className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]"
            >
              Describe the pricing model
            </label>
            <input
              id="customPricing"
              type="text"
              autoFocus
              value={data.customPricing}
              onChange={(e) => update("customPricing", e.target.value)}
              placeholder="e.g. Outcome-based — % of cost saved per project"
              maxLength={80}
              className="mt-2 h-11 w-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
            />
            <p className="mt-2 text-[11px] text-[var(--color-ink-3)]">
              Flagged for editorial review. We may rename or merge into a
              canonical model.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PricingCard({
  checked,
  label,
  proposed,
  onClick,
}: {
  checked: boolean;
  label: string;
  proposed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={cn(
        "group flex w-full items-center gap-3 border px-4 py-3 text-left transition-colors",
        checked
          ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]"
          : proposed
            ? "border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
            : "border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors",
          checked
            ? "border-[var(--color-canvas)] bg-[var(--color-canvas)]"
            : "border-[var(--color-line-strong)]",
        )}
      >
        {checked ? (
          <span className="block h-1.5 w-1.5 rounded-full bg-[var(--color-ink)]" />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
        <span className="truncate">{label}</span>
        {proposed && checked ? (
          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--color-canvas)]/70">
            Proposed
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          {title}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
        >
          Edit
        </button>
      </div>
      <dl className="mt-3 space-y-2">{children}</dl>
    </div>
  );
}

function ReviewLogo({
  label,
  file,
  alt,
}: {
  label: string;
  file: File;
  alt: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="grid grid-cols-[120px_1fr] gap-1">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        {label}
      </dt>
      <dd className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-canvas)]">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : null}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14px] text-[var(--color-ink)]">
            {file.name}
          </span>
          <span className="truncate text-[12px] text-[var(--color-ink-3)]">
            {alt || (
              <span className="text-[var(--color-magenta)]">
                — alt text missing —
              </span>
            )}
          </span>
        </div>
      </dd>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={cn("grid gap-1", multiline ? "" : "grid-cols-[120px_1fr]")}>
      <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        {label}
      </dt>
      <dd
        className={cn(
          "text-[14px] text-[var(--color-ink)]",
          multiline && "leading-relaxed",
        )}
      >
        {value || (
          <span className="text-[var(--color-ink-3)]">— not set —</span>
        )}
      </dd>
    </div>
  );
}

function ReviewTaxonomyRow({
  label,
  canonical,
  proposed,
}: {
  label: string;
  canonical: string[];
  proposed: string[];
}) {
  const empty = canonical.length === 0 && proposed.length === 0;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-1">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        {label}
      </dt>
      <dd className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] text-[var(--color-ink)]">
        {empty ? (
          <span className="text-[var(--color-ink-3)]">— not set —</span>
        ) : (
          <>
            {canonical.length > 0 ? <span>{canonical.join(", ")}</span> : null}
            {proposed.map((value) => (
              <span
                key={value}
                className="inline-flex items-center gap-1.5 border border-dashed border-[var(--color-coral)] bg-[var(--color-canvas-warm)] px-2 py-0.5 text-[12px]"
              >
                {value}
                <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--color-coral)]">
                  Proposed
                </span>
              </span>
            ))}
          </>
        )}
      </dd>
    </div>
  );
}

function ChipGroup({
  label,
  required,
  hint,
  options,
  selected,
  onToggle,
  scrollable,
  customSelected,
  onAddCustom,
  onRemoveCustom,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  options: { slug: string; name: string }[];
  selected: string[];
  onToggle: (slug: string) => void;
  scrollable?: boolean;
  customSelected?: string[];
  onAddCustom?: (value: string) => void;
  onRemoveCustom?: (value: string) => void;
}) {
  const allowCustom = Boolean(onAddCustom && onRemoveCustom);
  const customs = customSelected ?? [];

  return (
    <div>
      <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
        {label}
        {required ? (
          <span className="text-[var(--color-magenta)]"> *</span>
        ) : null}
      </p>
      {hint ? (
        <p className="mt-1 text-[12px] text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
      <ul
        className={cn(
          "mt-4 flex flex-wrap gap-2",
          scrollable && "max-h-[260px] overflow-y-auto pr-1",
        )}
      >
        {options.map((opt) => {
          const checked = selected.includes(opt.slug);
          return (
            <li key={opt.slug}>
              <button
                type="button"
                onClick={() => onToggle(opt.slug)}
                aria-pressed={checked}
                className={cn(
                  "inline-flex items-center gap-1.5 border px-3 py-1.5 text-[12px] transition-colors",
                  checked
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]"
                    : "border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink)]",
                )}
              >
                {checked ? <Check size={11} weight="bold" /> : null}
                <span>{opt.name}</span>
              </button>
            </li>
          );
        })}

        {customs.map((value) => (
          <li key={`custom:${value}`}>
            <span className="inline-flex items-center gap-1.5 border border-dashed border-[var(--color-coral)] bg-[var(--color-canvas-warm)] px-3 py-1.5 text-[12px] text-[var(--color-ink)]">
              <span>{value}</span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--color-coral)]">
                Proposed
              </span>
              <button
                type="button"
                onClick={() => onRemoveCustom?.(value)}
                aria-label={`Remove proposed ${label.toLowerCase()} ${value}`}
                className="ml-1 inline-flex h-4 w-4 items-center justify-center text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-ink)]"
              >
                <X size={10} weight="bold" />
              </button>
            </span>
          </li>
        ))}

        {allowCustom ? (
          <li>
            <SuggestChip
              label={label}
              existingNames={[...options.map((o) => o.name), ...customs]}
              onAdd={(value) => onAddCustom?.(value)}
            />
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function SuggestChip({
  label,
  existingNames,
  onAdd,
}: {
  label: string;
  existingNames: string[];
  onAdd: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const cancel = () => {
    setOpen(false);
    setDraft("");
    setError(null);
  };

  const submit = () => {
    const value = draft.trim();
    if (!value) {
      setError("Type a name first.");
      return;
    }
    if (value.length > 50) {
      setError("Keep it under 50 characters.");
      return;
    }
    if (existingNames.some((n) => n.toLowerCase() === value.toLowerCase())) {
      setError("Already in the list.");
      return;
    }
    onAdd(value);
    setDraft("");
    setError(null);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 border border-dashed border-[var(--color-line-strong)] bg-transparent px-3 py-1.5 text-[12px] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
      >
        <Plus size={11} weight="bold" />
        <span>Suggest one</span>
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1 border border-[var(--color-ink)] bg-[var(--color-surface)] px-2 py-1 text-[12px]">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          maxLength={50}
          placeholder={`New ${label.toLowerCase().replace(/s$/, "")}`}
          className="w-44 bg-transparent px-1 text-[12px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Add proposed value"
          className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-[var(--color-ink)] text-[var(--color-canvas)] transition-colors hover:bg-[var(--color-magenta)]"
        >
          <Check size={11} weight="bold" />
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel"
          className="inline-flex h-5 w-5 items-center justify-center text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-ink)]"
        >
          <X size={11} weight="bold" />
        </button>
      </span>
      {error ? (
        <span className="text-[10px] text-[var(--color-magenta)]">{error}</span>
      ) : null}
    </span>
  );
}
