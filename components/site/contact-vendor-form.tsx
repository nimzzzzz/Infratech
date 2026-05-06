"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PaperPlaneTilt,
  CheckCircle,
  ArrowRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type FormState = {
  name: string;
  email: string;
  company: string;
  role: string;
  subject: string;
  message: string;
  /** Honeypot — hidden from real users, filled by bots. Must stay empty. */
  website: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export function ContactForm({
  appSlug,
  appName,
  vendorName,
}: {
  appSlug: string;
  appName: string;
  vendorName: string;
}) {
  const [data, setData] = useState<FormState>({
    name: "",
    email: "",
    company: "",
    role: "",
    subject: "",
    message: "",
    website: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((fe) => {
        const { [key]: _drop, ...rest } = fe;
        return rest;
      });
    }
  };

  const isValid = Boolean(
    data.name.trim() &&
      data.email.trim() &&
      /\S+@\S+\.\S+/.test(data.email) &&
      data.subject.trim() &&
      data.message.trim().length >= 10,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setTopError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/contact-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appSlug, ...data }),
      });

      if (res.ok) {
        setDone(true);
        return;
      }

      // Server-side validation — surface field-level errors inline.
      if (res.status === 400) {
        const json = (await res.json().catch(() => ({}))) as {
          fieldErrors?: Record<string, string[]>;
        };
        const flat: FieldErrors = {};
        for (const [k, msgs] of Object.entries(json.fieldErrors ?? {})) {
          if (msgs && msgs[0]) flat[k as keyof FormState] = msgs[0];
        }
        setFieldErrors(flat);
        setTopError("Please fix the highlighted fields and try again.");
        return;
      }

      if (res.status === 404) {
        setTopError("This tool is no longer available.");
        return;
      }
      if (res.status === 429) {
        setTopError(
          "Too many requests from this network. Please try again in an hour.",
        );
        return;
      }
      if (res.status === 503) {
        setTopError("This vendor is not currently accepting inquiries.");
        return;
      }
      setTopError("Something went wrong. Please try again.");
    } catch {
      // Network error — `fetch` itself rejected.
      setTopError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-8 text-center md:p-12">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-canvas-warm)] text-[var(--color-coral)] ring-1 ring-[var(--color-line-strong)]">
          <CheckCircle size={28} weight="regular" />
        </span>
        <p className="mt-7 text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
          Message sent
        </p>
        <h2 className="mt-3 font-heading text-[26px] leading-tight tracking-tight md:text-[32px]">
          Off to {vendorName}.
        </h2>
        <p className="mx-auto mt-4 max-w-[48ch] text-[15px] leading-relaxed text-[var(--color-ink-2)]">
          We&rsquo;ve sent your message and emailed a confirmation to{" "}
          <span className="text-[var(--color-ink)]">{data.email}</span>.{" "}
          {vendorName}&rsquo;s team will reply directly to your inbox when they
          have a chance.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href={`/apps/${appSlug}`}
            className="group inline-flex h-11 items-center gap-2 bg-[var(--color-ink)] px-5 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-canvas)] transition active:translate-y-[1px]"
          >
            Back to {appName}
            <ArrowRight
              size={13}
              weight="bold"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
          >
            Browse the index
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:grid-cols-2 md:p-8"
    >
      {/* Honeypot — visually + semantically hidden from real users; bots
          that fill every input they encounter will trip the silent-drop
          on the server. tabindex / aria-hidden / autoComplete=off keep
          assistive tech and password managers from touching it. */}
      <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website (leave empty)</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={data.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      {topError ? (
        <div
          role="alert"
          className="md:col-span-2 border border-[var(--color-magenta)]/40 bg-[var(--color-magenta)]/5 px-4 py-3 text-[13px] text-[var(--color-magenta)]"
        >
          {topError}
        </div>
      ) : null}

      <Field
        label="Your name"
        htmlFor="name"
        required
        error={fieldErrors.name}
      >
        <input
          id="name"
          type="text"
          required
          value={data.name}
          onChange={(e) => update("name", e.target.value)}
          autoComplete="name"
          className={inputCls}
        />
      </Field>
      <Field
        label="Your email"
        htmlFor="email"
        required
        error={fieldErrors.email}
      >
        <input
          id="email"
          type="email"
          required
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
          autoComplete="email"
          placeholder="you@company.com"
          className={inputCls}
        />
      </Field>
      <Field
        label="Company"
        htmlFor="company"
        hint="Optional."
        error={fieldErrors.company}
      >
        <input
          id="company"
          type="text"
          value={data.company}
          onChange={(e) => update("company", e.target.value)}
          autoComplete="organization"
          className={inputCls}
        />
      </Field>
      <Field
        label="Your role"
        htmlFor="role"
        hint="Optional."
        error={fieldErrors.role}
      >
        <input
          id="role"
          type="text"
          value={data.role}
          onChange={(e) => update("role", e.target.value)}
          autoComplete="organization-title"
          placeholder="e.g. Project Manager"
          className={inputCls}
        />
      </Field>
      <div className="md:col-span-2">
        <Field
          label="Subject"
          htmlFor="subject"
          required
          error={fieldErrors.subject}
        >
          <input
            id="subject"
            type="text"
            required
            value={data.subject}
            onChange={(e) => update("subject", e.target.value)}
            maxLength={140}
            placeholder={`Inquiry about ${appName}`}
            className={inputCls}
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field
          label="Message"
          htmlFor="message"
          required
          hint="Plain English. Mention what you're trying to evaluate, your project context, and a sensible reply window."
          error={fieldErrors.message}
        >
          <textarea
            id="message"
            required
            rows={8}
            value={data.message}
            onChange={(e) => update("message", e.target.value)}
            placeholder="Hi — we're evaluating products for…"
            maxLength={3000}
            className="border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 py-2.5 text-[15px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
          />
          <p className="text-[11px] text-[var(--color-ink-3)]">
            <span className="num">{data.message.length}</span> /{" "}
            <span className="num">3000</span>
          </p>
        </Field>
      </div>

      <div className="md:col-span-2 flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 md:flex-row md:items-center md:justify-between">
        <p className="text-[11px] leading-relaxed text-[var(--color-ink-3)]">
          By sending, you agree to our{" "}
          <Link
            href="/legal/terms"
            className="underline underline-offset-4 hover:text-[var(--color-ink)]"
          >
            terms
          </Link>
          . Your email is shared only with {vendorName} for them to reply.
        </p>
        <button
          type="submit"
          disabled={!isValid || submitting}
          className={cn(
            "group inline-flex h-12 items-center justify-center gap-2 px-6 text-[12px] font-medium uppercase tracking-[0.2em] text-white transition active:translate-y-[1px]",
            isValid && !submitting
              ? "bloom"
              : "cursor-not-allowed bg-[var(--color-line)] text-[var(--color-ink-3)]",
          )}
        >
          {submitting ? (
            "Sending…"
          ) : (
            <>
              <PaperPlaneTilt size={14} weight="regular" />
              Send message
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]"
      >
        {label}
        {required ? (
          <span className="text-[var(--color-magenta)]"> *</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p
          role="alert"
          className="text-[12px] text-[var(--color-magenta)]"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}

const inputCls =
  "h-11 w-full border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none";
