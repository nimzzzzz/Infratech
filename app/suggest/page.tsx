import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { InnerHero } from "@/components/site/inner-hero";

export const metadata: Metadata = {
  title: "Suggest an app",
  description:
    "Suggest a project management or infrastructure app for inclusion in the Resolute Apps Directory.",
  alternates: { canonical: "/suggest" },
};

export default function SuggestPage() {
  return (
    <>
      <InnerHero
        eyebrow="Suggest"
        title={<>Tell us about a tool.</>}
        body={
          <p>
            Form submission lands in phase 2. For now, the fields below show
            what we&rsquo;ll ask &mdash; pre-fill anything you like and we&rsquo;ll wire
            it up.
          </p>
        }
      />
      <section className="bg-[var(--color-canvas)] pb-24 md:pb-32">
        <Container>
          <form
            className="grid gap-6 rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-[var(--color-surface)] p-8 md:grid-cols-2 md:p-12"
            aria-disabled
          >
            <Field label="App name" name="name" required />
            <Field label="Vendor / company" name="vendor" required />
            <Field label="Website" name="url" type="url" />
            <Field label="Your role" name="role" />
            <FieldArea
              label="What does it do, in plain English?"
              name="blurb"
              className="md:col-span-2"
              required
            />
            <Field
              label="Your name"
              name="contact-name"
              className="md:col-span-1"
            />
            <Field
              label="Your email"
              name="contact-email"
              type="email"
              className="md:col-span-1"
            />
            <button
              type="button"
              disabled
              className="mt-2 inline-flex h-12 items-center justify-center rounded-full bloom px-6 text-[15px] font-medium text-white opacity-70 md:col-span-2 md:w-fit"
            >
              Submit suggestion (offline in current build)
            </button>
          </form>
        </Container>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className ?? ""}`}>
      <span className="text-[13px] text-[var(--color-ink-2)]">
        {label}
        {required ? <span className="text-[var(--color-magenta)]"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        disabled
        className="h-11 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
      />
    </label>
  );
}

function FieldArea({
  label,
  name,
  required,
  className,
}: {
  label: string;
  name: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className ?? ""}`}>
      <span className="text-[13px] text-[var(--color-ink-2)]">
        {label}
        {required ? <span className="text-[var(--color-magenta)]"> *</span> : null}
      </span>
      <textarea
        name={name}
        rows={5}
        disabled
        className="rounded-md border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 py-2.5 text-[15px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
      />
    </label>
  );
}
