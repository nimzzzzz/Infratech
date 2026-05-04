import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { InnerHero } from "@/components/site/inner-hero";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the team behind the Resolute Apps Directory.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <InnerHero
        eyebrow="Contact"
        title={<>Say hello.</>}
        body={
          <p>
            Questions about the directory, corrections to a listing, or
            partnership enquiries &mdash; this inbox catches all three.
          </p>
        }
      />
      <section className="bg-[var(--color-canvas)] pb-24 md:pb-32">
        <Container className="grid gap-12 md:grid-cols-[5fr_7fr]">
          <div className="space-y-5">
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
                General
              </p>
              <p className="mt-2 text-[18px]">hello@resolute.example</p>
            </div>
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
                Listing corrections
              </p>
              <p className="mt-2 text-[18px]">listings@resolute.example</p>
            </div>
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
                Office
              </p>
              <p className="mt-2 max-w-[28ch] text-[16px] text-[var(--color-ink-2)] leading-relaxed">
                Resolute Management Consultancy. Address pending domain &amp;
                positioning lock.
              </p>
            </div>
          </div>
          <form
            className="grid gap-5 rounded-[var(--radius-xl)] border border-[var(--color-line)] bg-[var(--color-surface)] p-8 md:p-10"
            aria-disabled
          >
            <div className="grid gap-5 md:grid-cols-2">
              <SimpleField label="Name" name="name" />
              <SimpleField label="Email" name="email" type="email" />
            </div>
            <SimpleField label="Subject" name="subject" />
            <label className="flex flex-col gap-2">
              <span className="text-[13px] text-[var(--color-ink-2)]">Message</span>
              <textarea
                name="message"
                rows={6}
                disabled
                className="rounded-md border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 py-2.5 text-[15px] leading-relaxed"
              />
            </label>
            <button
              type="button"
              disabled
              className="inline-flex h-12 w-fit items-center justify-center rounded-full bloom px-6 text-[15px] font-medium text-white opacity-70"
            >
              Send (offline in current build)
            </button>
          </form>
        </Container>
      </section>
    </>
  );
}

function SimpleField({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] text-[var(--color-ink-2)]">{label}</span>
      <input
        name={name}
        type={type}
        disabled
        className="h-11 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 text-[15px]"
      />
    </label>
  );
}
