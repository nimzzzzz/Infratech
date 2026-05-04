import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { InnerHero } from "@/components/site/inner-hero";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ capability: string }>;
}): Promise<Metadata> {
  const { capability } = await params;
  const pretty = capability.replace(/-/g, " ");
  return {
    title: `${pretty} software`,
    description: `Project management software with ${pretty} capabilities.`,
    alternates: { canonical: `/capabilities/${capability}` },
  };
}

export default async function CapabilityPage({
  params,
}: {
  params: Promise<{ capability: string }>;
}) {
  const { capability } = await params;
  const pretty = capability.replace(/-/g, " ");

  return (
    <>
      <InnerHero
        eyebrow="Capability"
        title={
          <>
            {pretty.charAt(0).toUpperCase() + pretty.slice(1)}{" "}
            <span className="text-[var(--color-ink-3)]">software.</span>
          </>
        }
        body={
          <p>
            Capability landing pages with intro copy, filtered apps, and FAQ
            sections come online with the search and filter pass.
          </p>
        }
      />
      <section className="bg-[var(--color-canvas)] pb-24 md:pb-32">
        <Container>
          <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] p-12 text-center">
            <p className="text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
              Placeholder
            </p>
            <p className="mt-3 text-[18px] text-[var(--color-ink-2)]">
              Capability listings populate from the database in phase 1 build.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
