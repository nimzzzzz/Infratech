import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { LinkedInSignInButton } from "@/components/auth/linkedin-sign-in-button";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in with LinkedIn to manage your dashboard or submit a new product.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Already signed in? Skip the login form. Clerk's SDK refuses to
  // start a fresh sign-in flow when a session already exists ("You're
  // already signed in"), and the public-chrome header (now session-
  // aware below) shouldn't be lying anyway. /dashboard's
  // getVendorSession handles onward routing — onboarding gate,
  // suspended check, no-vendor lazy-create, etc.
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const sp = await searchParams;
  const intentParam = Array.isArray(sp.intent) ? sp.intent[0] : sp.intent;
  const intent = intentParam === "submit" ? "submit" : "signin";
  const heroImage = findHeroImage();

  // Where the LinkedIn OAuth flow lands the user after the handshake
  // completes. The demo-mode tiles below it are dev-only previews
  // (DEMO_MODE auto-disables in production via env.ts), so they keep
  // their static <Link> behaviour.
  const linkedInRedirectComplete =
    intent === "submit"
      ? "/dashboard/onboarding/submit?as=returning"
      : "/dashboard";
  const newVendorHref = "/dashboard?as=new";
  const returningVendorHref =
    intent === "submit"
      ? "/dashboard/onboarding/submit?as=returning"
      : "/dashboard";

  const eyebrow = intent === "submit" ? "List your product" : "Sign in";
  const title = intent === "submit" ? "List your product." : "Welcome back.";
  const subtitle =
    intent === "submit"
      ? "Sign in with LinkedIn to submit a new product. We use LinkedIn to verify you represent the company before a listing goes live."
      : "Sign in with LinkedIn to manage your dashboard, edit listings, and reply to inquiries.";
  const primaryCtaLabel =
    intent === "submit" ? "Continue with LinkedIn" : "Sign in with LinkedIn";

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 bg-[var(--color-canvas)] md:grid-cols-2">
      {/* LEFT — image panel (hidden on mobile, top banner replaces it) */}
      <aside className="relative hidden overflow-hidden bg-[var(--color-night)] md:block">
        <div aria-hidden className="absolute inset-0 hero-fallback" />
        {heroImage ? (
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
          />
        ) : null}

        {/* subtle top-and-bottom scrim for overlay legibility */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(9,9,11,0.45) 0%, transparent 32%, transparent 60%, rgba(9,9,11,0.65) 100%)",
          }}
        />

        {/* brand top-left */}
        <Link
          href="/"
          aria-label="InfratechDatabase home"
          className="group absolute left-8 top-8 inline-flex items-center gap-2.5 lg:left-12 lg:top-12"
        >
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bloom" />
            <span className="absolute inset-0 rounded-full bloom animate-ping opacity-40" />
          </span>
          <span className="font-heading text-[20px] italic leading-none tracking-tight text-white">
            InfratechDatabase
          </span>
        </Link>

        {/* editorial caption bottom-left */}
        <div className="absolute bottom-8 left-8 right-8 max-w-md lg:bottom-12 lg:left-12 lg:right-12">
          <p className="font-heading text-[24px] leading-tight text-white md:text-[28px] lg:text-[34px]">
            {intent === "submit"
              ? "Get your product seen by the people who run the projects."
              : "Pick up where you left off."}
          </p>
        </div>
      </aside>

      {/* RIGHT — form column */}
      <main className="relative flex flex-col px-6 py-10 sm:px-10 md:px-12 md:py-12 lg:px-20">
        {/* mobile-only image banner — sits above the form on small viewports */}
        {heroImage ? (
          <figure className="relative -mx-6 -mt-10 mb-8 h-40 overflow-hidden bg-[var(--color-night)] sm:-mx-10 md:hidden">
            <div aria-hidden className="absolute inset-0 hero-fallback" />
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(9,9,11,0.4) 0%, transparent 50%, rgba(9,9,11,0.5) 100%)",
              }}
            />
            <Link
              href="/"
              className="absolute left-5 top-5 inline-flex items-center gap-2"
            >
              <span className="inline-block h-2 w-2 rounded-full bloom" />
              <span className="font-heading text-[18px] italic leading-none text-white">
                InfratechDatabase
              </span>
            </Link>
          </figure>
        ) : null}

        {/* desktop back link, top of form column */}
        <div className="hidden md:block">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
          >
            <ArrowLeft
              size={12}
              weight="bold"
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            />
            Back to the index
          </Link>
        </div>

        {/* centered form content */}
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-md">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
              {eyebrow}
            </p>
            <h1 className="mt-5 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[56px]">
              {title}
            </h1>
            <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
              {subtitle}
            </p>

            <LinkedInSignInButton
              redirectUrlComplete={linkedInRedirectComplete}
              label={primaryCtaLabel}
            />

            {/* demo-mode toggle — pre-wiring real auth, lets you preview both flows */}
            <div className="mt-5 border border-dashed border-[var(--color-line-strong)] bg-[var(--color-canvas-warm)]/40 p-3.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
                Demo mode
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-2)]">
                Real LinkedIn auth lands in Phase 2. Pick a flow to preview:
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href={newVendorHref}
                  className="group inline-flex h-10 items-center justify-center gap-1.5 border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]"
                >
                  New vendor
                  <ArrowRight
                    size={11}
                    weight="bold"
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  href={returningVendorHref}
                  className="group inline-flex h-10 items-center justify-center gap-1.5 border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-3 text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]"
                >
                  Returning vendor
                  <ArrowRight
                    size={11}
                    weight="bold"
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </div>

            {/* explainer */}
            <div className="mt-6 border-t border-[var(--color-line)] pt-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
                Why LinkedIn?
              </p>
              <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-[var(--color-ink-2)]">
                Product listings are tied to verified vendor companies &mdash; no
                anonymous claims, no astroturfing. LinkedIn lets us confirm you
                actually work where you say without asking for documents.
              </p>
            </div>

            {/* legal */}
            <p className="mt-8 max-w-[44ch] text-[11px] leading-relaxed text-[var(--color-ink-3)]">
              By continuing, you agree to our{" "}
              <Link
                href="/legal/vendor-terms"
                className="underline underline-offset-4 hover:text-[var(--color-ink)]"
              >
                vendor terms
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                className="underline underline-offset-4 hover:text-[var(--color-ink)]"
              >
                privacy policy
              </Link>
              .
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
