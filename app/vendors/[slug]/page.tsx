import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Buildings,
  Calendar,
  MapPin,
  UsersThree,
  Stack,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import { AppCard } from "@/components/browse/app-card";
import { vendors, type Vendor } from "@/lib/data/vendors";
import { appsByVendor } from "@/lib/data/apps";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateStaticParams() {
  return vendors.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = vendors.find((v) => v.slug === slug);
  if (!vendor) return { title: "Vendor not found" };
  return {
    title: `${vendor.name} — Vendor profile`,
    description: vendor.shortBlurb,
    alternates: { canonical: `/vendors/${vendor.slug}` },
    openGraph: {
      title: `${vendor.name} on InfraTechDB`,
      description: vendor.shortBlurb,
      url: `${SITE_URL}/vendors/${vendor.slug}`,
      type: "website",
    },
  };
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vendor = vendors.find((v) => v.slug === slug);
  if (!vendor) notFound();

  const tools = appsByVendor(vendor.slug);
  const paragraphs = vendor.description
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  return (
    <article className="bg-[var(--color-canvas)]">
      <JsonLd vendor={vendor} toolCount={tools.length} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[var(--color-line)] pt-28 md:pt-36">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 h-[440px] w-[440px] opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, rgba(214,51,108,0.16), rgba(249,115,22,0.10) 50%, transparent 75%)",
          }}
        />
        <Container className="relative">
          <Breadcrumb vendorName={vendor.name} />

          <div className="mt-8 grid gap-10 md:grid-cols-[7fr_5fr] md:gap-14">
            <div className="flex flex-col">
              <div className="flex items-start gap-5">
                {vendor.logoUrl ? (
                  <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-canvas)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={vendor.logoUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </span>
                ) : (
                  <LetterAvatar name={vendor.name} className="h-16 w-16 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
                    Vendor profile
                  </p>
                  <h1 className="mt-2 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[56px]">
                    {vendor.name}
                  </h1>
                </div>
              </div>
              <p className="mt-6 max-w-[60ch] text-[18px] leading-relaxed text-[var(--color-ink-2)] md:text-[19px]">
                {vendor.shortBlurb}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={vendor.websiteUrl}
                  target="_blank"
                  rel="nofollow noopener"
                  className="group relative inline-flex h-12 items-center gap-2 overflow-hidden bg-[var(--color-coral)] px-5 text-[12px] font-medium uppercase tracking-[0.2em] text-white transition-transform active:translate-y-[1px]"
                >
                  <span className="relative z-10">Visit website</span>
                  <ArrowUpRight
                    size={13}
                    weight="bold"
                    className="relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-[var(--color-magenta)] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0"
                  />
                </a>
                <Link
                  href={`#tools`}
                  className="group inline-flex h-12 items-center gap-2 border border-[var(--color-line-strong)] bg-transparent px-5 text-[12px] font-medium uppercase tracking-[0.2em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]"
                >
                  <Stack size={13} weight="regular" />
                  <span>
                    {tools.length} {tools.length === 1 ? "product" : "products"} listed
                  </span>
                </Link>
              </div>
            </div>

            {/* Facts panel */}
            <aside className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 md:p-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
                At a glance
              </p>
              <dl className="mt-5 space-y-4">
                <FactRow
                  icon={Calendar}
                  label="Founded"
                  value={<span className="num">{vendor.founded}</span>}
                />
                <FactRow
                  icon={UsersThree}
                  label="Team size"
                  value={vendor.employeeBand}
                />
                <FactRow
                  icon={MapPin}
                  label="Headquarters"
                  value={vendor.headquarters}
                />
                <FactRow
                  icon={Buildings}
                  label="Products listed"
                  value={<span className="num">{tools.length}</span>}
                />
              </dl>
            </aside>
          </div>
        </Container>
      </section>

      {/* TOOLS — vendor's roster (now the second thing on the page) */}
      <section
        id="tools"
        className="scroll-mt-24 bg-[var(--color-canvas)] py-14 md:py-20"
      >
        <Container>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
                &sect; Products by this vendor
              </p>
              <h2 className="mt-3 font-heading text-[28px] leading-[1.05] tracking-tight md:text-[36px]">
                {tools.length === 1
                  ? `${vendor.name}'s listing.`
                  : `Everything ${vendor.name} has in the index.`}
              </h2>
            </div>
            <Link
              href="/"
              className="group hidden items-center gap-1.5 self-end text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] sm:inline-flex"
            >
              Browse all
              <ArrowUpRight
                size={11}
                weight="bold"
                className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          {tools.length === 0 ? (
            <p className="border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] p-12 text-center text-[15px] text-[var(--color-ink-2)]">
              No products listed yet.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t) => (
                <li key={t.slug}>
                  <AppCard app={t} />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      {/* ABOUT — moved below the tool roster */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-14 md:py-20">
        <Container>
          <div className="md:max-w-[68ch]">
            <Section eyebrow="§ About the company">
              <div className="space-y-5 text-[17px] leading-relaxed text-[var(--color-ink)] md:text-[18px]">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <p className="mt-8 text-[13px] text-[var(--color-ink-3)]">
                Are you {vendor.name}?{" "}
                <Link
                  href="/login"
                  className="underline underline-offset-4 hover:text-[var(--color-ink)]"
                >
                  Claim or edit this profile
                </Link>
                .
              </p>
            </Section>
          </div>
        </Container>
      </section>
    </article>
  );
}

function Breadcrumb({ vendorName }: { vendorName: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] uppercase tracking-[0.16em] text-[var(--color-ink-3)]">
      <Link href="/" className="hover:text-[var(--color-ink)]">
        Index
      </Link>
      <span aria-hidden>/</span>
      <span className="text-[var(--color-ink-2)]">Vendors</span>
      <span aria-hidden>/</span>
      <span className="truncate text-[var(--color-ink-2)]">{vendorName}</span>
    </div>
  );
}

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        {eyebrow}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
    className?: string;
  }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <Icon
        size={14}
        weight="regular"
        className="mt-0.5 shrink-0 text-[var(--color-ink-3)]"
      />
      <div className="flex min-w-0 flex-col">
        <dt className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          {label}
        </dt>
        <dd className="mt-0.5 text-[15px] text-[var(--color-ink)]">{value}</dd>
      </div>
    </div>
  );
}

function JsonLd({ vendor, toolCount }: { vendor: Vendor; toolCount: number }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: vendor.name,
    description: vendor.shortBlurb,
    url: vendor.websiteUrl,
    foundingDate: String(vendor.founded),
    address: vendor.headquarters,
    numberOfEmployees: vendor.employeeBand,
    makesOffer: toolCount,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
