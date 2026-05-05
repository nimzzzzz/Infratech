import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { InnerHero } from "@/components/site/inner-hero";
import {
  getCapabilityBySlug,
  listCapabilities,
} from "@/lib/queries/taxonomy";
import { listAppsByCapability } from "@/lib/queries/apps";

export async function generateStaticParams() {
  const caps = await listCapabilities();
  return caps.map((c) => ({ capability: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ capability: string }>;
}): Promise<Metadata> {
  const { capability } = await params;
  const found = await getCapabilityBySlug(capability);
  if (!found) return { title: "Capability not found" };
  return {
    title: `${found.name} software`,
    description: `Project management software with ${found.name.toLowerCase()} capabilities.`,
    alternates: { canonical: `/capabilities/${found.slug}` },
  };
}

export default async function CapabilityPage({
  params,
}: {
  params: Promise<{ capability: string }>;
}) {
  const { capability } = await params;
  const data = await getCapabilityBySlug(capability);
  if (!data) notFound();

  const apps = await listAppsByCapability(data.slug);

  return (
    <>
      <InnerHero
        eyebrow="Capability"
        title={<>{data.name} software.</>}
        body={
          <p>
            {data.description ??
              `Products with ${data.name.toLowerCase()} capabilities.`}
          </p>
        }
      />
      <section className="bg-[var(--color-canvas)] pb-24 md:pb-32">
        <Container>
          {apps.length === 0 ? (
            <p className="text-[16px] text-[var(--color-ink-2)]">
              No apps tagged with this capability yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
              {apps.map((app) => (
                <li key={app.slug}>
                  <Link
                    href={`/apps/${app.slug}`}
                    className="group grid items-center gap-6 py-7 transition-colors hover:bg-[var(--color-surface)] md:grid-cols-[1fr_2fr_auto] md:px-4"
                  >
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--color-ink-3)]">
                        {app.vendor.name}
                      </p>
                      <p className="font-heading text-[22px] leading-tight">
                        {app.name}
                      </p>
                    </div>
                    <p className="max-w-[60ch] text-[15px] leading-relaxed text-[var(--color-ink-2)]">
                      {app.tagline}
                    </p>
                    <ArrowUpRight
                      size={20}
                      weight="regular"
                      className="text-[var(--color-ink-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}
