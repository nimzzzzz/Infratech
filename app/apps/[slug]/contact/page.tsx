import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import { ContactForm } from "@/components/site/contact-vendor-form";
import { getAppBySlug, listAllAppSlugs } from "@/lib/queries/apps";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await listAllAppSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (err) {
    console.warn("[apps/[slug]/contact] generateStaticParams skipped:", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const app = await getAppBySlug(slug);
  if (!app) return { title: "App not found" };
  return {
    title: `Contact ${app.vendor.name} about ${app.name}`,
    // Reachable only from the tool detail "Contact vendor" button — keep it
    // out of search results and out of the sitemap.
    robots: { index: false, follow: false },
    alternates: { canonical: `/apps/${app.slug}/contact` },
  };
}

export default async function ContactVendorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = await getAppBySlug(slug);
  if (!app) notFound();

  return (
    <article className="bg-[var(--color-canvas)] pt-10 md:pt-14">
      <Container className="max-w-3xl pb-20 md:pb-28">
        {/* back link */}
        <Link
          href={`/apps/${app.slug}`}
          className="group inline-flex items-center gap-1.5 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
        >
          <ArrowLeft
            size={12}
            weight="bold"
            className="transition-transform duration-300 group-hover:-translate-x-0.5"
          />
          Back to {app.name}
        </Link>

        {/* header */}
        <div className="mt-8 flex items-start gap-5">
          <LetterAvatar name={app.name} className="h-14 w-14 shrink-0" />
          <div>
            <p className="text-[14px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
              {app.vendor.name}
            </p>
            <h1 className="mt-2 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[48px]">
              Contact about {app.name}.
            </h1>
          </div>
        </div>

        <p className="mt-6 max-w-[58ch] text-[17px] leading-relaxed text-[var(--color-ink-2)] md:text-[18px]">
          Your message goes directly to the {app.vendor.name} team. We
          don&rsquo;t publish their email address &mdash; you&rsquo;ll get a
          confirmation from us, then they reply directly to your inbox.
        </p>

        <div className="mt-10">
          <ContactForm
            appSlug={app.slug}
            appName={app.name}
            vendorName={app.vendor.name}
          />
        </div>
      </Container>
    </article>
  );
}
