import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  At,
  Calendar,
  Globe,
  MapPin,
  ShieldCheck,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getCompanyDetailForAdmin } from "@/lib/queries/directory";
import { relativeDays } from "@/lib/browse/dates";
import { cn } from "@/lib/utils";
import { ModerationActions } from "@/components/admin/directory/moderation-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Admin · Directory · ${id}`,
    alternates: { canonical: `/admin/directory/${id}` },
    robots: { index: false, follow: false },
  };
}

export default async function AdminDirectoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendorId = Number(id);
  if (!Number.isFinite(vendorId) || vendorId <= 0) notFound();

  const [, detail] = await Promise.all([
    getAdminSession(),
    getCompanyDetailForAdmin(vendorId),
  ]);
  if (!detail) notFound();

  const { vendor, products, members } = detail;

  return (
    <Container className="max-w-5xl py-10 md:py-14">
      <Link
        href="/admin/directory"
        prefetch
        className="group inline-flex items-center gap-1.5 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft
          size={12}
          weight="bold"
          className="transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        Back to directory
      </Link>

      <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-[13px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
              Company
            </p>
            <StatusPill suspended={vendor.suspended} />
          </div>
          <h1 className="mt-3 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[44px]">
            {vendor.name}
          </h1>
          <p className="mt-2 text-[14px] text-[var(--color-ink-3)]">
            <Link
              href={`/vendors/${vendor.slug}`}
              className="font-mono text-[var(--color-coral)] underline-offset-4 hover:underline"
            >
              /vendors/{vendor.slug}
            </Link>{" "}
            · Joined{" "}
            <span className="num">
              {relativeDays(vendor.createdAt.toISOString().slice(0, 10)).label}
            </span>
          </p>
        </div>
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-[1fr_auto] md:gap-10">
        <dl className="grid gap-3 text-[15px] sm:grid-cols-[auto_1fr] sm:gap-x-6">
          {vendor.contactEmail ? (
            <FactRow icon={At} label="Contact">
              <a
                href={`mailto:${vendor.contactEmail}`}
                className="text-[var(--color-coral)] underline-offset-4 hover:underline"
              >
                {vendor.contactEmail}
              </a>
            </FactRow>
          ) : null}
          {vendor.websiteUrl ? (
            <FactRow icon={Globe} label="Website">
              <a
                href={vendor.websiteUrl}
                target="_blank"
                rel="nofollow noopener"
                className="text-[var(--color-ink)] underline-offset-4 hover:underline"
              >
                {vendor.websiteUrl}
              </a>
            </FactRow>
          ) : null}
          {vendor.foundedYear ? (
            <FactRow icon={Calendar} label="Founded">
              <span className="num">{vendor.foundedYear}</span>
            </FactRow>
          ) : null}
          {vendor.hqCountry ? (
            <FactRow icon={MapPin} label="Headquarters">
              {vendor.hqCountry}
            </FactRow>
          ) : null}
          <FactRow icon={UserCircle} label="Members">
            {members.length}
          </FactRow>
        </dl>
      </section>

      {vendor.description ? (
        <section className="mt-8 max-w-prose">
          <p className="text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
            Description
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[16px] leading-relaxed text-[var(--color-ink)]">
            {vendor.description}
          </p>
        </section>
      ) : null}

      {/* Moderation actions card */}
      <div className="mt-10">
        <ModerationActions
          vendorId={vendor.id}
          vendorName={vendor.name}
          suspended={vendor.suspended}
          hasContactEmail={Boolean(vendor.contactEmail)}
        />
      </div>

      {/* Products */}
      <section className="mt-12">
        <h2 className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
          Products ({products.length})
        </h2>
        {products.length === 0 ? (
          <p className="mt-4 text-[15px] text-[var(--color-ink-3)]">
            No products yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {products.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[1fr_auto] items-center gap-4 py-4 md:px-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/apps/${p.slug}`}
                    className="font-heading text-[18px] leading-tight underline-offset-4 hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-0.5 truncate text-[13px] text-[var(--color-ink-3)]">
                    /{p.slug}
                  </p>
                </div>
                <AppStatusPill status={p.status} />
                {/* TODO(A.4 PR 3): per-product Flag button here. */}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Members */}
      <section className="mt-12">
        <h2 className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-2)]">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="mt-4 text-[15px] text-[var(--color-ink-3)]">
            No members.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {members.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[1fr_auto] items-center gap-4 py-4 md:px-3"
              >
                <div className="min-w-0">
                  <p className="text-[16px] text-[var(--color-ink)]">
                    {m.name}
                    {m.isAdmin ? (
                      <span className="ml-2 inline-flex items-center gap-1 border border-[var(--color-magenta)]/40 bg-[var(--color-canvas-warm)] px-1.5 py-0.5 align-middle text-[11px] uppercase tracking-[0.18em] text-[var(--color-magenta)]">
                        <ShieldCheck size={9} weight="fill" />
                        Admin
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-[var(--color-ink-3)]">
                    {m.primaryEmail}
                    {m.role ? ` · ${m.role}` : ""}
                  </p>
                </div>
                <MemberStatusPill
                  onboarded={m.onboarded}
                  suspended={m.suspended}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}

function FactRow({
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

function StatusPill({ suspended }: { suspended: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] ring-1",
        suspended
          ? "bg-rose-50 text-rose-700 ring-rose-300"
          : "bg-emerald-50 text-emerald-700 ring-emerald-300",
      )}
    >
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

function AppStatusPill({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-300"
      : status === "pending_review"
        ? "bg-[var(--color-coral)]/10 text-[var(--color-coral)] ring-[var(--color-coral)]/40"
        : status === "rejected"
          ? "bg-rose-50 text-rose-700 ring-rose-300"
          : "bg-[var(--color-canvas-warm)] text-[var(--color-ink-2)] ring-[var(--color-line-strong)]";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function MemberStatusPill({
  onboarded,
  suspended,
}: {
  onboarded: boolean;
  suspended: boolean;
}) {
  if (suspended) {
    return (
      <span className="inline-flex items-center bg-rose-50 px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] text-rose-700 ring-1 ring-rose-300">
        Suspended
      </span>
    );
  }
  if (!onboarded) {
    return (
      <span className="inline-flex items-center bg-[var(--color-canvas-warm)] px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] ring-1 ring-[var(--color-line-strong)]">
        Pending onboarding
      </span>
    );
  }
  return (
    <span className="inline-flex items-center bg-emerald-50 px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-300">
      Onboarded
    </span>
  );
}
