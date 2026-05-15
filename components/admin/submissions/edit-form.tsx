"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Field =
  | "name"
  | "slug"
  | "tagline"
  | "description"
  | "stages"
  | "capabilities"
  | "industries"
  | "pricing";

type FormState = Partial<Record<Field, string>>;

/**
 * Admin edit form for a submission. Pre-fills from the submission's
 * existing adminEdits (if any) falling back to the original payload.
 * Submits to /api/admin/submissions/:id/edit; only fields the admin
 * actually changed are sent (server merges them over payload).
 *
 * Array fields (stages/capabilities/industries) are exposed as
 * comma-separated text inputs in PR 1 — simple, low-friction. Full
 * chip pickers can land later if the editorial team wants them.
 */
export function EditForm({
  submissionId,
  payload,
  existingEdits,
  onCancel,
  onSaved,
}: {
  submissionId: number;
  payload: Record<string, unknown>;
  existingEdits: Record<string, unknown> | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const prefill = (key: Field): string => {
    const fromEdits =
      existingEdits && existingEdits[key] !== undefined && existingEdits[key] !== null
        ? existingEdits[key]
        : null;
    const source = fromEdits ?? payload[key];
    if (Array.isArray(source)) return source.join(", ");
    return typeof source === "string" ? source : "";
  };

  const [form, setForm] = useState<FormState>({
    name: prefill("name"),
    slug: prefill("slug"),
    tagline: prefill("tagline"),
    description: prefill("description"),
    stages: prefill("stages"),
    capabilities: prefill("capabilities"),
    industries: prefill("industries"),
    pricing: prefill("pricing"),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: Field, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const splitCsv = (s: string): string[] =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const body = {
      name: form.name?.trim() || undefined,
      slug: form.slug?.trim() || undefined,
      tagline: form.tagline?.trim() || undefined,
      description: form.description?.trim() || undefined,
      stages: form.stages ? splitCsv(form.stages) : undefined,
      capabilities: form.capabilities ? splitCsv(form.capabilities) : undefined,
      industries: form.industries ? splitCsv(form.industries) : undefined,
      pricing: form.pricing?.trim() || undefined,
    };

    try {
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/edit`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          fieldErrors?: Record<string, string[]>;
        };
        if (j.fieldErrors) {
          const firstField = Object.keys(j.fieldErrors)[0];
          const firstMsg = firstField ? j.fieldErrors[firstField]?.[0] : null;
          setError(firstMsg ?? j.error ?? "Validation failed");
        } else {
          setError(j.error ?? "Something went wrong");
        }
        setSubmitting(false);
        return;
      }
      onSaved();
    } catch (err) {
      console.error("[admin.edit] submit failed", err);
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-6">
      <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
        Editing — saving sends the submission back to the vendor for approval
      </p>

      <FieldText label="Name" htmlFor="ed-name" value={form.name ?? ""} onChange={(v) => set("name", v)} />
      <FieldText label="Slug" htmlFor="ed-slug" value={form.slug ?? ""} onChange={(v) => set("slug", v)} hint="Lowercase alphanumeric + hyphen. Drives the public URL." />
      <FieldText label="Tagline" htmlFor="ed-tagline" value={form.tagline ?? ""} onChange={(v) => set("tagline", v)} />
      <FieldTextarea label="Description" htmlFor="ed-desc" value={form.description ?? ""} onChange={(v) => set("description", v)} rows={6} />
      <FieldText label="Stages (comma-separated slugs)" htmlFor="ed-stages" value={form.stages ?? ""} onChange={(v) => set("stages", v)} hint="e.g. delivery, operations" />
      <FieldText label="Capabilities (comma-separated slugs)" htmlFor="ed-caps" value={form.capabilities ?? ""} onChange={(v) => set("capabilities", v)} />
      <FieldText label="Industries (comma-separated slugs)" htmlFor="ed-inds" value={form.industries ?? ""} onChange={(v) => set("industries", v)} />
      <FieldText label="Pricing model (slug)" htmlFor="ed-pricing" value={form.pricing ?? ""} onChange={(v) => set("pricing", v)} />

      {error ? (
        <p
          role="alert"
          className="border border-[var(--color-coral)]/40 bg-[var(--color-coral)]/5 px-3 py-2 text-[15px] text-[var(--color-coral)]"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-10 items-center gap-1.5 px-4 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "inline-flex h-11 items-center gap-2 bg-[var(--color-ink)] px-5 text-[14px] uppercase tracking-[0.18em] text-[var(--color-canvas)] transition-colors hover:bg-[var(--color-ink-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-coral)] active:translate-y-[1px]",
            submitting ? "opacity-70" : "",
          )}
        >
          <Check size={13} weight="bold" />
          {submitting ? "Saving…" : "Save edits"}
        </button>
      </div>
    </form>
  );
}

function FieldText({
  label,
  htmlFor,
  value,
  onChange,
  hint,
}: {
  label: string;
  htmlFor: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]"
      >
        {label}
      </label>
      <input
        id={htmlFor}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[16px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
      />
      {hint ? (
        <p className="text-[14px] text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}

function FieldTextarea({
  label,
  htmlFor,
  value,
  onChange,
  rows,
}: {
  label: string;
  htmlFor: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]"
      >
        {label}
      </label>
      <textarea
        id={htmlFor}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-[16px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
      />
    </div>
  );
}
