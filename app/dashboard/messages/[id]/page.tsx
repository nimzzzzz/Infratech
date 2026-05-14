import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  EnvelopeSimple,
  At,
  Buildings,
  Briefcase,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import {
  getVendorSession,
  isDemoOverride,
} from "@/lib/auth/session";
import {
  getMessageByIdForVendor,
  type VendorMessageListItem,
} from "@/lib/queries/messages";
import { relativeDays } from "@/lib/browse/dates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Inbox · ${id}`,
    alternates: { canonical: `/dashboard/messages/${id}` },
    robots: { index: false, follow: false },
  };
}

export default async function MessageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const asParam = Array.isArray(sp.as) ? sp.as[0] : sp.as;
  const demoOverride = isDemoOverride(asParam) ? asParam : undefined;

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const { vendor } = await getVendorSession({ demoOverride });

  const msg = await getMessageByIdForVendor(numericId, vendor.id);
  if (!msg) notFound();

  const mailto = buildReplyMailto(msg);
  const paragraphs = msg.body.split(/\n\n+/).filter((p) => p.trim());

  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <Link
        href="/dashboard/messages"
        prefetch
        className="group inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft
          size={12}
          weight="bold"
          className="transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        Back to inbox
      </Link>

      <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
            Inquiry &middot; about{" "}
            <Link
              href={`/apps/${msg.appSlug}`}
              className="underline-offset-4 hover:underline"
            >
              {msg.appName}
            </Link>
          </p>
          <h1 className="mt-3 font-heading text-[28px] leading-[1.1] tracking-tight md:text-[36px]">
            {msg.subject}
          </h1>
        </div>
        <p className="num shrink-0 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
          {relativeDays(msg.createdAt.toISOString().slice(0, 10)).label}
        </p>
      </div>

      <div className="mt-8 grid gap-6 border border-[var(--color-line-strong)] bg-[var(--color-canvas-warm)]/40 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
        <dl className="grid gap-3 text-[13px] sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <Row icon={At} label="From">
            <span className="font-medium text-[var(--color-ink)]">
              {msg.senderName}
            </span>{" "}
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
        </dl>
        <a
          href={mailto}
          className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden bg-[var(--color-coral)] px-5 text-[12px] font-medium uppercase tracking-[0.2em] text-white transition-transform active:translate-y-[1px]"
        >
          <EnvelopeSimple size={14} weight="regular" />
          <span>Reply via email</span>
          <ArrowUpRight
            size={13}
            weight="bold"
            className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>
      </div>

      <article className="mt-10 space-y-5 border-l border-[var(--color-line)] pl-6 text-[16px] leading-relaxed text-[var(--color-ink)] md:text-[17px]">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </article>

      <p className="mt-12 max-w-[60ch] text-[12px] leading-relaxed text-[var(--color-ink-3)]">
        Replying via email opens your default mail client with{" "}
        <span className="text-[var(--color-ink-2)]">{msg.senderEmail}</span>{" "}
        pre-filled. The visitor will see the reply land directly in their
        inbox &mdash; the platform doesn&rsquo;t track responses sent this way.
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
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        <Icon size={12} weight="regular" />
        {label}
      </dt>
      <dd className="text-[var(--color-ink-2)]">{children}</dd>
    </>
  );
}

function buildReplyMailto(msg: VendorMessageListItem): string {
  const subject = encodeURIComponent(`Re: ${msg.subject}`);
  const greeting = `Hi ${msg.senderName.split(" ")[0]},\n\n`;
  const quoted = msg.body
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  const body = encodeURIComponent(
    `${greeting}\n\n— On ${msg.createdAt.toDateString()}, ${msg.senderName} wrote:\n${quoted}`,
  );
  return `mailto:${msg.senderEmail}?subject=${subject}&body=${body}`;
}
