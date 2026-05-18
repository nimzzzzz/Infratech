import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  At,
  Buildings,
  Briefcase,
  Storefront,
  Stack,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getInquiryByIdForAdmin } from "@/lib/queries/messages";
import { relativeDays } from "@/lib/browse/dates";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Admin · Inquiry ${id}`,
    alternates: { canonical: `/admin/inquiries/${id}` },
    robots: { index: false, follow: false },
  };
}

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  // Race auth against the fetch — admin queries are global.
  const [, msg] = await Promise.all([
    getAdminSession(),
    getInquiryByIdForAdmin(numericId),
  ]);
  if (!msg) notFound();

  const paragraphs = msg.body.split(/\n\n+/).filter((p) => p.trim());

  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <Link
        href="/admin/inquiries"
        prefetch
        className="group inline-flex items-center gap-1.5 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft
          size={12}
          weight="bold"
          className="transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        Back to inquiries
      </Link>

      <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
              Inquiry &middot; about{" "}
              <Link
                href={`/apps/${msg.appSlug}`}
                className="underline-offset-4 hover:underline"
              >
                {msg.appName}
              </Link>
            </p>
            <StatusPill status={msg.status} />
          </div>
          <h1 className="mt-3 font-heading text-[30px] leading-[1.1] tracking-tight md:text-[40px]">
            {msg.subject}
          </h1>
        </div>
        <p className="num shrink-0 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
          {relativeDays(msg.createdAt.toISOString().slice(0, 10)).label}
        </p>
      </div>

      <div className="mt-8 grid gap-6 border border-[var(--color-line-strong)] bg-[var(--color-canvas-warm)]/40 p-5 md:p-6">
        <dl className="grid gap-3 text-[15px] sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <Row icon={At} label="From">
            <span className="text-[var(--color-ink)]">{msg.senderName}</span>{" "}
            <a
              href={`mailto:${msg.senderEmail}`}
              className="text-[var(--color-coral)] underline-offset-4 hover:underline"
            >
              &lt;{msg.senderEmail}&gt;
            </a>
          </Row>
          {msg.senderCompany ? (
            <Row icon={Buildings} label="Company">
              {msg.senderCompany}
            </Row>
          ) : null}
          {msg.senderRole ? (
            <Row icon={Briefcase} label="Role">
              {msg.senderRole}
            </Row>
          ) : null}
          <Row icon={Storefront} label="Vendor">
            <Link
              href={`/vendors/${msg.vendorSlug}`}
              className="text-[var(--color-ink)] underline-offset-4 hover:underline"
            >
              {msg.vendorName}
            </Link>
          </Row>
          <Row icon={Stack} label="Product">
            <Link
              href={`/apps/${msg.appSlug}`}
              className="text-[var(--color-ink)] underline-offset-4 hover:underline"
            >
              {msg.appName}
            </Link>
          </Row>
        </dl>
      </div>

      <article className="mt-10 space-y-5 border-l border-[var(--color-line)] pl-6 text-[18px] leading-relaxed text-[var(--color-ink)] md:text-[19px]">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </article>

      <p className="mt-12 max-w-[60ch] text-[14px] leading-relaxed text-[var(--color-ink-3)]">
        Vendors handle replies via email directly with the visitor — the
        platform doesn&rsquo;t track responses. This admin view is read-only;
        the &ldquo;{statusLabel(msg.status)}&rdquo; status above reflects the
        vendor&rsquo;s inbox state and is not editable from here.
      </p>
    </Container>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
    className?: string;
  }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="flex items-center gap-1.5 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        <Icon size={12} weight="regular" />
        {label}
      </dt>
      <dd className="text-[var(--color-ink-2)]">{children}</dd>
    </>
  );
}

function StatusPill({ status }: { status: "unread" | "read" | "archived" }) {
  const tone =
    status === "unread"
      ? "bg-[var(--color-coral)]/10 text-[var(--color-coral)] ring-[var(--color-coral)]/40"
      : status === "read"
        ? "bg-[var(--color-canvas-warm)] text-[var(--color-ink-2)] ring-[var(--color-line-strong)]"
        : "bg-slate-50 text-slate-600 ring-slate-300";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: "unread" | "read" | "archived"): string {
  if (status === "unread") return "Unread";
  if (status === "read") return "Read";
  return "Archived";
}
