import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { InnerHero } from "@/components/site/inner-hero";
import { stages } from "@/lib/data/stages";
import { apps as allApps } from "@/lib/data/apps";

export async function generateStaticParams() {
  return stages.map((s) => ({ stage: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}): Promise<Metadata> {
  const { stage } = await params;
  const found = stages.find((s) => s.slug === stage);
  if (!found) return { title: "Stage not found" };
  return {
    title: `${found.name} software`,
    description: `Project management and infrastructure software used during the ${found.name.toLowerCase()} stage. ${found.short}`,
    alternates: { canonical: `/stages/${found.slug}` },
  };
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  const data = stages.find((s) => s.slug === stage);
  if (!data) notFound();

  const apps = allApps.filter((a) => a.stages.includes(data.slug));

  return (
    <>
      <InnerHero
        eyebrow={`Stage ${data.index} · ${data.name}`}
        title={<>{data.name} software.</>}
        body={<p>{data.short} &mdash; the tools teams reach for in this phase.</p>}
      />
      <section className="bg-[var(--color-canvas)] pb-24 md:pb-32">
        <Container>
          {apps.length === 0 ? (
            <p className="text-[16px] text-[var(--color-ink-2)]">
              No apps catalogued in this stage yet.
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
                        {app.vendor}
                      </p>
                      <p className="font-heading text-[22px] leading-tight">
                        {app.name}
                      </p>
                    </div>
                    <p className="max-w-[60ch] text-[15px] leading-relaxed text-[var(--color-ink-2)]">
                      {app.blurb}
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
