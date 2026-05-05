import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { InnerHero } from "@/components/site/inner-hero";
import {
  getCapabilityBySlug,
  listCapabilities,
} from "@/lib/queries/taxonomy";
import { listAppsByCapability } from "@/lib/queries/apps";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const caps = await listCapabilities();
    return caps.map((c) => ({ capability: c.slug }));
  } catch (err) {
    console.warn("[capabilities/[capability]] generateStaticParams skipped:", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ capability: string }>;
}): Promise<Metadata> {
  const { capability } = await params;
  const found = await getCapabilityBySlug(capability);
  if (!found) return { title: "Capability not found" };
  const description =
    found.description ??
    `Project management software with ${found.name.toLowerCase()} capabilities.`;
  return {
    title: `${found.name} software — Tools across the project lifecycle`,
    description,
    alternates: { canonical: `/capabilities/${found.slug}` },
    openGraph: {
      title: `${found.name} software — InfraTechDB`,
      description,
      url: `${SITE_URL}/capabilities/${found.slug}`,
      type: "website",
    },
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
  const introParagraphs = (data.introMd ?? "")
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  return (
    <>
      <InnerHero
        eyebrow="Capability"
        title={
          <>
            {data.name}{" "}
            <span className="text-[var(--color-ink-3)]">software.</span>
          </>
        }
        body={
          data.description ? (
            <p>{data.description}</p>
          ) : (
            <p>
              Tools listed in this directory under the{" "}
              {data.name.toLowerCase()} capability.
            </p>
          )
        }
      />

      <JsonLd capability={data} apps={apps} />

      {introParagraphs.length > 0 ? (
        <section className="bg-[var(--color-canvas)] py-10 md:py-14">
          <Container>
            <div className="md:max-w-[68ch] space-y-5 text-[16px] leading-relaxed text-[var(--color-ink)] md:text-[17px]">
              {introParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <section className="bg-[var(--color-canvas)] pb-24 md:pb-32">
        <Container>
          <header className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--color-line-strong)] pb-3">
            <h2 className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
              Tools with this capability{" "}
              <span className="num text-[var(--color-ink-3)]">
                ({apps.length})
              </span>
            </h2>
            <Link
              href={`/browse?capability=${data.slug}`}
              className="group inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
            >
              Open in browser
              <ArrowRight
                size={11}
                weight="bold"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </header>

          {apps.length === 0 ? (
            <p className="text-[16px] text-[var(--color-ink-2)]">
              No tools tagged with this capability yet.
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

function JsonLd({
  capability,
  apps,
}: {
  capability: { slug: string; name: string; description: string | null };
  apps: { slug: string; name: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${capability.name} software — InfraTechDB`,
    description: capability.description ?? undefined,
    url: `${SITE_URL}/capabilities/${capability.slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: "InfraTechDB",
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: apps.length,
      itemListElement: apps.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/apps/${a.slug}`,
        name: a.name,
      })),
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
