import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  EnvelopeSimple,
  Stack,
  UserCircle,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import { getMockSession } from "@/lib/auth/mock-session";
import { messagesForVendor, unreadCount } from "@/lib/data/messages";
import { relativeDays } from "@/lib/browse/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  alternates: { canonical: "/dashboard" },
};

const VENDOR_SLUG = "arctus";

// Mocked vendor listings. In Phase 2, hydrate from DB by vendorSlug.
const mockListings = [
  {
    slug: "arctus-field",
    name: "Arctus Field",
    status: "live" as const,
    addedAt: "2026-04-12",
  },
  {
    slug: "arctus-insights",
    name: "Arctus Insights",
    status: "in-review" as const,
    addedAt: "2026-04-30",
  },
];

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // Demo override — `?as=new` simulates a brand-new vendor with zero listings,
  // which forces the gating redirect below. In real auth the listings array
  // comes from the DB by vendorSlug; if the array is empty, the gate fires
  // automatically with no override needed.
  const listings = sp.as === "new" ? [] : mockListings;

  // ── GATING ──────────────────────────────────────────────────────────
  // Vendors with no listings shouldn't see the dashboard yet — they're
  // mid-onboarding. Send them back to the onboarding landing to claim or
  // submit a tool first.
  if (listings.length === 0) {
    redirect("/dashboard/onboarding");
  }

  const { user, company } = getMockSession();
  const firstName = user.name.split(" ")[0];
  const allMessages = messagesForVendor(VENDOR_SLUG);
  const unread = unreadCount(VENDOR_SLUG);
  const recent = allMessages
    .slice()
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, 4);

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        &sect; Vendor dashboard
      </p>
      <h1 className="mt-4 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[52px]">
        Welcome back, {firstName}.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ink-2)] md:text-[15px]">
        {company.name}&rsquo;s account, at a glance. New inquiries and listing
        status sit here.
      </p>

      {/* OVERVIEW STATS */}
      <ul className="mt-10 grid grid-cols-1 gap-px border border-[var(--color-line-strong)] bg-[var(--color-line-strong)] sm:grid-cols-3">
        <StatCard
          icon={EnvelopeSimple}
          label="Unread inquiries"
          value={unread}
          href="/dashboard/messages"
          accent={unread > 0}
        />
        <StatCard
          icon={Stack}
          label="Listed products"
          value={listings.filter((l) => l.status === "live").length}
          href="#listings"
        />
        <StatCard
          icon={UserCircle}
          label="In review"
          value={listings.filter((l) => l.status === "in-review").length}
          href="#listings"
        />
      </ul>

      {/* RECENT MESSAGES */}
      <section className="mt-14">
        <header className="flex items-end justify-between gap-4 border-b border-[var(--color-line-strong)] pb-3">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
            Recent inquiries
          </h2>
          <Link
            href="/dashboard/messages"
            className="group inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            View all
            <ArrowRight
              size={11}
              weight="bold"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </header>

        {recent.length === 0 ? (
          <p className="mt-6 text-[14px] text-[var(--color-ink-3)]">
            No inquiries yet.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {recent.map((msg) => (
              <li key={msg.id}>
                <Link
                  href={`/dashboard/messages/${msg.id}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:grid-cols-[auto_1fr_auto_88px] md:gap-6 md:px-3"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      msg.status === "unread"
                        ? "bg-[var(--color-coral)]"
                        : "bg-[var(--color-line-strong)]",
                    )}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[15px] leading-tight",
                        msg.status === "unread"
                          ? "font-medium text-[var(--color-ink)]"
                          : "text-[var(--color-ink-2)]",
                      )}
                    >
                      {msg.subject}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-3)]">
                      {msg.from.name}
                      {msg.from.company ? ` · ${msg.from.company}` : ""} ·{" "}
                      <span className="text-[var(--color-coral)]">
                        {msg.appName}
                      </span>
                    </p>
                  </div>
                  <span className="hidden text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)] md:inline">
                    {msg.from.role ?? ""}
                  </span>
                  <span className="num text-right text-[11px] text-[var(--color-ink-3)]">
                    {relativeDays(msg.receivedAt.slice(0, 10)).label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* LISTINGS */}
      <section id="listings" className="mt-14 scroll-mt-24">
        <header className="flex items-end justify-between gap-4 border-b border-[var(--color-line-strong)] pb-3">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
            Your listings
          </h2>
          <Link
            href="/dashboard/onboarding/submit?as=returning"
            className="group inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            <Plus size={11} weight="bold" />
            Add another product
          </Link>
        </header>

        <ul className="divide-y divide-[var(--color-line)]">
          {listings.map((listing) => (
            <li
              key={listing.slug}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 md:gap-6 md:px-3"
            >
              <LetterAvatar name={listing.name} className="h-10 w-10" />
              <div className="min-w-0">
                <p className="font-heading text-[20px] leading-tight">
                  {listing.name}
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
                  Listed{" "}
                  <span className="num">
                    {relativeDays(listing.addedAt).label}
                  </span>
                </p>
              </div>
              <StatusBadge status={listing.status} />
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  accent,
}: {
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
    className?: string;
  }>;
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full flex-col justify-between gap-6 bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:p-6"
      >
        <div className="flex items-center justify-between">
          <Icon
            size={18}
            weight="regular"
            className={cn(
              accent ? "text-[var(--color-coral)]" : "text-[var(--color-ink-2)]",
            )}
          />
          <ArrowRight
            size={14}
            weight="regular"
            className="text-[var(--color-ink-3)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </div>
        <div>
          <p
            className={cn(
              "num font-heading text-[36px] leading-none tracking-tight md:text-[44px]",
              accent ? "text-[var(--color-coral)]" : "text-[var(--color-ink)]",
            )}
          >
            {String(value).padStart(2, "0")}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
            {label}
          </p>
        </div>
      </Link>
    </li>
  );
}

function StatusBadge({ status }: { status: "live" | "in-review" }) {
  const config = {
    live: {
      label: "Live",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-300",
    },
    "in-review": {
      label: "In review",
      className:
        "bg-[var(--color-coral)]/10 text-[var(--color-coral)] ring-[var(--color-coral)]/40",
    },
  } as const;
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ring-1",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}
