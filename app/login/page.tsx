import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";
import { LinkedInSignInButton } from "@/components/auth/linkedin-sign-in-button";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in with LinkedIn to list your product on AllInfratech.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

/**
 * Find a hero image asset in /public. Lets the page degrade gracefully
 * to the dark canvas treatment if the asset hasn't been added yet
 * (and avoids a hard import that would fail the build on a fresh
 * checkout).
 */
function findHeroImage(): string | null {
  for (const name of ["hero.jpg", "hero.jpeg", "hero.png", "hero.webp"]) {
    try {
      if (existsSync(join(process.cwd(), "public", name))) {
        return `/${name}`;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Vendor login. Single CTA (Sign in with LinkedIn), single voice.
 *
 * The `?intent=submit` query param is still read so the header's
 * "List your product" CTA can deep-link straight into the returning-
 * vendor submission wizard after auth. The on-page copy stays
 * unified regardless — the param only influences post-OAuth
 * routing, not the visible page.
 *
 * Already-signed-in users are bounced server-side to /dashboard.
 * Clerk's SDK rejects a fresh sign-in flow when a session exists
 * ("You're already signed in"), and the header is session-aware.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const sp = await searchParams;
  const intentParam = Array.isArray(sp.intent) ? sp.intent[0] : sp.intent;
  // Always land at /post-signin first — that server page reads the
  // vendor_members row and branches on is_admin / intent. The
  // ?intent=submit carry-through preserves the "list your product"
  // deep-link → returning-vendor wizard flow for vendors (admins
  // ignore the intent and land on /admin regardless).
  const linkedInRedirectComplete =
    intentParam === "submit" ? "/post-signin?intent=submit" : "/post-signin";

  const heroImage = findHeroImage();

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 bg-[var(--color-canvas)] md:grid-cols-2">
      {/* LEFT — branded hero panel (desktop only). The right column
          carries its own brand strip on mobile to avoid loading the
          hero image on small viewports. */}
      <aside className="relative hidden overflow-hidden bg-[var(--color-night)] md:block">
        {heroImage ? (
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
          />
        ) : (
          <div aria-hidden className="absolute inset-0 hero-fallback" />
        )}

        {/* Top + bottom scrim so the wordmark and caption stay legible
            regardless of what's in the underlying image. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(9,9,11,0.55) 0%, transparent 30%, transparent 55%, rgba(9,9,11,0.75) 100%)",
          }}
        />

        {/* Italic Alike wordmark — matches the header treatment.
            Clickable: gives a vendor who navigated here on purpose
            a quiet path back to the public directory without a
            visible "back" link cluttering the form column. */}
        <Link
          href="/"
          aria-label="AllInfratech home"
          className="group absolute left-10 top-10 inline-flex items-center gap-2.5 lg:left-14 lg:top-14"
        >
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bloom" />
            <span className="absolute inset-0 rounded-full bloom animate-ping opacity-40" />
          </span>
          <span className="font-heading text-[22px] italic leading-none tracking-tight text-white lg:text-[24px]">
            AllInfratech
          </span>
        </Link>

        {/* Editorial caption — defines what AllInfratech is. The
            right column defines what the vendor does here. Two
            distinct voices on one page. Locked tagline per CLAUDE.md. */}
        <p className="absolute bottom-10 left-10 right-10 max-w-md font-heading text-[26px] leading-tight tracking-tight text-white md:text-[30px] lg:bottom-14 lg:left-14 lg:right-14 lg:text-[36px]">
          A repository of infrastructure technology products and companies.
        </p>
      </aside>

      {/* RIGHT — form column. Single-purpose: get the vendor into
          OAuth with one click. */}
      <main className="relative flex flex-col">
        {/* Mobile-only brand strip — replaces the desktop hero
            image. Dark canvas-warm slab with the wordmark so the
            page still has a brand anchor at 375px width. */}
        <div className="flex items-center justify-center bg-[var(--color-night)] px-6 py-5 md:hidden">
          <Link
            href="/"
            aria-label="AllInfratech home"
            className="inline-flex items-center gap-2"
          >
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bloom" />
            </span>
            <span className="font-heading text-[22px] italic leading-none tracking-tight text-white">
              AllInfratech
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center px-6 py-12 sm:px-10 md:px-12 md:py-16 lg:px-20">
          <div className="w-full max-w-md">
            <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
              For vendors
            </p>
            <h1 className="mt-5 font-heading text-[40px] leading-[1.04] tracking-tight text-[var(--color-ink)] md:text-[52px] lg:text-[60px]">
              List your product on{" "}
              <span className="italic">AllInfratech</span>.
            </h1>
            <p className="mt-6 max-w-[44ch] text-[18px] leading-relaxed text-[var(--color-ink-2)] md:text-[19px]">
              Reach project-management and infrastructure-technology buyers
              across the region. Sign in with LinkedIn to get started.
            </p>

            <div className="mt-10">
              <LinkedInSignInButton
                redirectUrlComplete={linkedInRedirectComplete}
                label="Sign in with LinkedIn"
              />
            </div>

            <p className="mt-6 max-w-[44ch] text-[13px] leading-relaxed text-[var(--color-ink-3)]">
              By signing in you agree to our{" "}
              <Link
                href="/legal/terms"
                className="underline underline-offset-4 hover:text-[var(--color-ink)]"
              >
                Terms
              </Link>
              ,{" "}
              <Link
                href="/legal/privacy"
                className="underline underline-offset-4 hover:text-[var(--color-ink)]"
              >
                Privacy Policy
              </Link>
              , and{" "}
              <Link
                href="/legal/cookies"
                className="underline underline-offset-4 hover:text-[var(--color-ink)]"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
