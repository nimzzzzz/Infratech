import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Plus,
  MagnifyingGlass,
  Check,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { getMockSession } from "@/lib/auth/mock-session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Welcome to Stagecraft",
  alternates: { canonical: "/dashboard/onboarding" },
};

// Mocked: returning vendors are assumed to have 1 existing tool listing.
// In production this would come from the auth session / DB.
const MOCK_RETURNING_TOOL_COUNT = 1;

export default async function OnboardingLandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const isReturning = sp.as === "returning";
  const { user, company } = getMockSession();
  const firstName = user.name.split(" ")[0];

  return (
    <Container className="max-w-3xl py-12 md:py-20">
      <DemoToggle isReturning={isReturning} />

      {isReturning ? (
        <ReturningVendorView
          firstName={firstName}
          companyName={company.name}
          existingToolCount={MOCK_RETURNING_TOOL_COUNT}
        />
      ) : (
        <NewVendorView
          firstName={firstName}
          companyName={company.name}
          userTitle={user.title}
        />
      )}

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

// ──────────────────────────────────────────────────────────────────────
// New vendor — sees the two-paths landing
// ──────────────────────────────────────────────────────────────────────

function NewVendorView({
  firstName,
  companyName,
  userTitle,
}: {
  firstName: string;
  companyName: string;
  userTitle: string;
}) {
  return (
    <>
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        &sect; Welcome
      </p>
      <h1 className="mt-5 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[56px]">
        Welcome to Stagecraft, {firstName}.
      </h1>
      <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        We&rsquo;ve verified you with LinkedIn as{" "}
        <strong className="font-medium text-[var(--color-ink)]">
          {userTitle} at {companyName}
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
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Returning vendor — single CTA, no claim path, no setup wizard
// ──────────────────────────────────────────────────────────────────────

function ReturningVendorView({
  firstName,
  companyName,
  existingToolCount,
}: {
  firstName: string;
  companyName: string;
  existingToolCount: number;
}) {
  return (
    <>
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        &sect; Welcome back
      </p>
      <h1 className="mt-5 font-heading text-[40px] leading-[1.04] tracking-tight md:text-[56px]">
        Welcome back, {firstName}.
      </h1>
      <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-ink)]">
          <Check size={14} weight="bold" className="text-[var(--color-coral)]" />
          {companyName}&rsquo;s profile is on file
        </span>{" "}
        with{" "}
        <span className="num text-[var(--color-ink)]">
          {existingToolCount}
        </span>{" "}
        published {existingToolCount === 1 ? "listing" : "listings"}. Add
        another tool when you&rsquo;re ready.
      </p>

      <ul className="mt-12 space-y-4">
        <li>
          <PathCard
            href="/dashboard/onboarding/submit?as=returning"
            eyebrow="Add a tool"
            icon={Plus}
            title="Add another tool to your portfolio."
            body={`Just the tool details — your company profile carries over from your existing ${companyName} account. We'll review the submission and publish it within two business days.`}
          />
        </li>
      </ul>
    </>
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

function DemoToggle({ isReturning }: { isReturning: boolean }) {
  return (
    <div className="mb-8 inline-flex items-center gap-1 border border-dashed border-[var(--color-line-strong)] bg-[var(--color-canvas-warm)]/40 p-1 text-[10px] uppercase tracking-[0.18em]">
      <span className="px-2 text-[var(--color-ink-3)]">Demo as</span>
      <Link
        href="/dashboard/onboarding"
        className={cn(
          "px-3 py-1 transition-colors",
          !isReturning
            ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
            : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
        )}
      >
        New vendor
      </Link>
      <Link
        href="/dashboard/onboarding?as=returning"
        className={cn(
          "px-3 py-1 transition-colors",
          isReturning
            ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
            : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
        )}
      >
        Returning
      </Link>
    </div>
  );
}
