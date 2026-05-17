import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Buildings,
  Calendar,
  Globe,
  MapPin,
  UsersThree,
  Stack,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import { AppCard } from "@/components/browse/app-card";
import {
  getVendorBySlug,
  getVendorRegionSlugs,
  listAllVendorSlugs,
} from "@/lib/queries/vendors";
import { listAppsByVendorSlug } from "@/lib/queries/apps";
import { lookups, regions as REGION_TAXONOMY } from "@/lib/data/taxonomy";
import type { Vendor } from "@/lib/db/schema";

const GEO_REGION_SLUGS = REGION_TAXONOMY
  .filter((r) => r.slug !== "global")
  .map((r) => r.slug);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await listAllVendorSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (err) {
    console.warn("[vendors/[slug]] generateStaticParams skipped:", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Vendor not found" };
  return {
    title: `${vendor.name} — Vendor profile`,
    description: vendor.shortBlurb ?? undefined,
    alternates: { canonical: `/vendors/${vendor.slug}` },
    openGraph: {
      title: `${vendor.name} on AllInfratech`,
      description: vendor.shortBlurb ?? undefined,
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
  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();

  const [tools, regionSlugs] = await Promise.all([
    listAppsByVendorSlug(vendor.slug),
    getVendorRegionSlugs(vendor.id),
  ]);
  const paragraphs = (vendor.description ?? "")
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  const allGeoRegions =
    regionSlugs.length > 0 &&
    GEO_REGION_SLUGS.every((s) => regionSlugs.includes(s));
  const regionLabel = allGeoRegions
    ? "All regions"
    : regionSlugs.map((s) => lookups.region.get(s) ?? s).join(", ");

  return (
    <article className="bg-[var(--color-canvas)]">
      <JsonLd vendor={vendor} toolCount={tools.length} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[var(--color-line)] pt-10 md:pt-14">
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
                  <span className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-canvas)] md:h-48 md:w-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={vendor.logoUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </span>
                ) : (
                  <LetterAvatar
                    name={vendor.name}
                    className="h-28 w-28 shrink-0 md:h-48 md:w-48"
                    letterClassName="text-[64px] md:text-[110px]"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-[14px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
                    Vendor profile
                  </p>
                  <h1 className="mt-2 font-heading text-[44px] leading-[1.04] tracking-tight md:text-[60px]">
                    {vendor.name}
                  </h1>
                </div>
              </div>
              <p className="mt-6 max-w-[60ch] text-[20px] leading-relaxed text-[var(--color-ink-2)] md:text-[20px]">
                {vendor.shortBlurb}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={vendor.websiteUrl ?? "#"}
                  target="_blank"
                  rel="nofollow noopener"
                  className="group relative inline-flex h-12 items-center gap-2 overflow-hidden bg-[var(--color-coral)] px-5 text-[14px] uppercase tracking-[0.2em] text-white transition-transform active:translate-y-[1px]"
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
                  className="group inline-flex h-12 items-center gap-2 border border-[var(--color-line-strong)] bg-transparent px-5 text-[14px] uppercase tracking-[0.2em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]"
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
              <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
                At a glance
              </p>
              <dl className="mt-5 space-y-4">
                {vendor.foundedYear ? (
                  <FactRow
                    icon={Calendar}
                    label="Founded"
                    value={
                      <span className="num">{String(vendor.foundedYear)}</span>
                    }
                  />
                ) : null}
                {vendor.employeeBand ? (
                  <FactRow
                    icon={UsersThree}
                    label="Team size"
                    value={vendor.employeeBand}
                  />
                ) : null}
                {vendor.hqCountry ? (
                  <FactRow
                    icon={MapPin}
                    label="Headquarters"
                    value={vendor.hqCountry}
                  />
                ) : null}
                {regionSlugs.length > 0 ? (
                  <FactRow
                    icon={Globe}
                    label="Regions served"
                    value={regionLabel}
                  />
                ) : null}
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

      {/* ABOUT — visitors learn who the company is before what they sell. */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-14 md:py-20">
        <Container>
          <Section eyebrow="About the company">
            <div className="space-y-5 text-[19px] leading-relaxed text-[var(--color-ink)] md:text-[20px]">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="mt-8 space-y-3 text-[15px] leading-relaxed text-[var(--color-ink-3)]">
              {vendor.linkedinUrl ? (
                <p>
                  <a
                    href={vendor.linkedinUrl}
                    target="_blank"
                    rel="nofollow noopener"
                    className="group inline-flex items-center gap-1.5 text-[var(--color-ink)] underline-offset-4 hover:underline"
                  >
                    LinkedIn
                    <ArrowUpRight
                      size={12}
                      weight="bold"
                      className="opacity-60 transition-opacity group-hover:opacity-100"
                    />
                  </a>
                </p>
              ) : null}
              <p>
                Are you {vendor.name}?{" "}
                <Link
                  href="/login"
                  className="underline underline-offset-4 hover:text-[var(--color-ink)]"
                >
                  Claim or edit this profile
                </Link>
                .
              </p>
            </div>
          </Section>
        </Container>
      </section>

      {/* PRODUCTS — vendor's roster, anchor target for the hero CTA. */}
      <section
        id="tools"
        className="scroll-mt-24 border-t border-[var(--color-line)] bg-[var(--color-canvas)] py-14 md:py-20"
      >
        <Container>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[14px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
                Products by this vendor
              </p>
              <h2 className="mt-3 font-heading text-[30px] leading-[1.05] tracking-tight md:text-[40px]">
                {tools.length === 1
                  ? `${vendor.name}'s listing.`
                  : `Everything ${vendor.name} has in the index.`}
              </h2>
            </div>
            <Link
              href="/"
              className="group hidden items-center gap-1.5 self-end text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] sm:inline-flex"
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
            <p className="border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] p-12 text-center text-[17px] text-[var(--color-ink-2)]">
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

      {/* Gallery moved from vendor profile to product detail
          (/apps/[slug]) in feat/move-gallery-to-product. Screenshots
          are product-level — one set per listing — and rendered on
          the app detail page next to the product video. */}
    </article>
  );
}

function Breadcrumb({ vendorName }: { vendorName: string }) {
  return (
    <div className="flex items-center gap-2 text-[15px] uppercase tracking-[0.16em] text-[var(--color-ink-3)]">
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
      <p className="text-[14px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
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
        <dt className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          {label}
        </dt>
        <dd className="mt-0.5 text-[17px] text-[var(--color-ink)]">{value}</dd>
      </div>
    </div>
  );
}

function JsonLd({ vendor, toolCount }: { vendor: Vendor; toolCount: number }) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: vendor.name,
    description: vendor.shortBlurb ?? undefined,
    url: vendor.websiteUrl ?? undefined,
    sameAs: [vendor.websiteUrl, vendor.linkedinUrl].filter(
      (u): u is string => Boolean(u),
    ),
    foundingDate: vendor.foundedYear ? String(vendor.foundedYear) : undefined,
    address: vendor.hqCountry
      ? { "@type": "PostalAddress", addressCountry: vendor.hqCountry }
      : undefined,
    numberOfEmployees: vendor.employeeBand ?? undefined,
    logo: vendor.logoUrl ?? undefined,
    knowsAbout: `Maintains ${toolCount} ${toolCount === 1 ? "product" : "products"} in the AllInfratech directory.`,
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Index", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Vendors",
        item: `${SITE_URL}/vendors`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: vendor.name,
        item: `${SITE_URL}/vendors/${vendor.slug}`,
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  );
}
