import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Plus,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { getMockSession } from "@/lib/auth/mock-session";

export const metadata: Metadata = {
  title: "Welcome to InfraTechDB",
  alternates: { canonical: "/dashboard/onboarding" },
};

/**
 * Onboarding landing — only shown to NEW vendors who haven't claimed or
 * submitted anything yet. Returning vendors skip this page entirely and land
 * on /dashboard directly (with the "+ Add another tool" CTA in the listings
 * section if they want a second tool).
 */
export default function OnboardingLandingPage() {
  const { user, company } = getMockSession();
  const firstName = user.name.split(" ")[0];

  return (
    <Container className="max-w-3xl py-12 md:py-20">
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        &sect; Welcome
      </p>
      <h1 className="mt-5 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[56px]">
        Welcome to InfraTechDB, {firstName}.
      </h1>
      <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        We&rsquo;ve verified you with LinkedIn as{" "}
        <strong className="font-medium text-[var(--color-ink)]">
          {user.title} at {company.name}
        </strong>
        . You&rsquo;ve got two paths from here.
      </p>

      <ul className="mt-12 space-y-4">
        <li>
          <PathCard
            href="/dashboard/onboarding/claim"
            eyebrow="Path A"
            icon={MagnifyingGlass}
            title="Claim an existing listing."
            body="If your tool is already in the directory as an editorial stub, claim it and we'll transfer ownership after verifying. You can edit the description, add screenshots, and update categories."
          />
        </li>
        <li>
          <PathCard
            href="/dashboard/onboarding/submit"
            eyebrow="Path B"
            icon={Plus}
            title="Submit a new tool."
            body="Walk through six short steps to set up your company profile and add your first tool to the directory. We'll review the submission and email you when it's live, usually within two business days."
          />
        </li>
      </ul>

      <p className="mt-12 max-w-[60ch] text-[13px] leading-relaxed text-[var(--color-ink-3)]">
        Just looking around?{" "}
        <Link
          href="/"
          className="underline underline-offset-4 hover:text-[var(--color-ink)]"
        >
          Browse the directory
        </Link>
        .
      </p>
    </Container>
  );
}

function PathCard({
  href,
  eyebrow,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  eyebrow: string;
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
    className?: string;
  }>;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group relative grid grid-cols-[auto_1fr_auto] items-start gap-5 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 transition-colors hover:border-[var(--color-ink)]/40 md:p-8"
    >
      <span className="grid h-12 w-12 place-items-center bg-[var(--color-canvas)] text-[var(--color-ink)] ring-1 ring-[var(--color-line-strong)]">
        <Icon size={20} weight="regular" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
          {eyebrow}
        </p>
        <p className="mt-2 font-heading text-[22px] leading-tight tracking-tight md:text-[26px]">
          {title}
        </p>
        <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ink-2)]">
          {body}
        </p>
      </div>
      <ArrowRight
        size={18}
        weight="regular"
        className="mt-2 text-[var(--color-ink-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]"
      />
    </Link>
  );
}
