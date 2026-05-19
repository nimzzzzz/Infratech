import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Warning,
  Stack,
  EnvelopeSimple,
  ClipboardText,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getCompanyDeletionImpact } from "@/lib/queries/directory";
import { DeleteConfirmForm } from "@/components/admin/directory/delete-confirm-form";

export const metadata: Metadata = {
  title: "Admin · Directory · Delete",
  robots: { index: false, follow: false },
};

/**
 * Dedicated confirmation page for /admin/directory/[id]/delete. The
 * deletion is irreversible — getting to this surface requires a
 * deliberate click from the moderation card; the page itself adds a
 * typed-name gate before the destructive button activates.
 *
 * Renders the FULL scale of deletion: product titles, submission +
 * inquiry counts, and the member list (name + email) so the admin
 * sees exactly who they're orphaning / blocking.
 */
export default async function AdminDirectoryDeletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendorId = Number(id);
  if (!Number.isFinite(vendorId) || vendorId <= 0) notFound();

  const [session, impact] = await Promise.all([
    getAdminSession(),
    getCompanyDeletionImpact(vendorId),
  ]);
  if (!impact) notFound();

  const isSelfMember = session.admin.vendorId === impact.vendor.id;

  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <Link
        href={`/admin/directory/${vendorId}`}
        prefetch
        className="group inline-flex items-center gap-1.5 text-[14px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft
          size={12}
          weight="bold"
          className="transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        Back to company
      </Link>

      <div className="mt-8 flex items-center gap-3">
        <Warning size={16} weight="fill" className="text-rose-600" />
        <p className="text-[13px] uppercase tracking-[0.32em] text-rose-700">
          Permanently delete this company
        </p>
      </div>
      <h1 className="mt-3 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[44px]">
        {impact.vendor.name}
      </h1>
      <p className="mt-2 text-[14px] text-[var(--color-ink-3)]">
        <span className="font-mono text-[var(--color-coral)]">
          /vendors/{impact.vendor.slug}
        </span>
      </p>

      <section className="mt-10 border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-5 md:p-6">
        <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          Scale of deletion
        </p>

        <ul className="mt-4 space-y-3">
          <ImpactRow
            icon={Stack}
            count={impact.productCount}
            singular="product"
            plural="products"
          >
            {impact.productCount > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-[14px] text-[var(--color-ink-2)]">
                {impact.productNames.slice(0, 8).map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
                {impact.productNames.length > 8 ? (
                  <li className="text-[var(--color-ink-3)]">
                    + {impact.productNames.length - 8} more
                  </li>
                ) : null}
              </ul>
            ) : null}
          </ImpactRow>
          <ImpactRow
            icon={ClipboardText}
            count={impact.submissionCount}
            singular="submission (any status)"
            plural="submissions (any status)"
          />
          <ImpactRow
            icon={EnvelopeSimple}
            count={impact.inquiryCount}
            singular="inquiry"
            plural="inquiries"
          />
          <ImpactRow
            icon={UserCircle}
            count={impact.members.length}
            singular="member"
            plural="members"
          >
            {impact.members.length > 0 ? (
              <ul className="mt-2 space-y-1 text-[14px]">
                {impact.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-baseline gap-x-2 text-[var(--color-ink-2)]"
                  >
                    <span className="text-[var(--color-ink)]">{m.name}</span>
                    <a
                      href={`mailto:${m.primaryEmail}`}
                      className="text-[var(--color-coral)] underline-offset-4 hover:underline"
                    >
                      &lt;{m.primaryEmail}&gt;
                    </a>
                    {m.isAdmin ? (
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-magenta)]">
                        admin
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </ImpactRow>
        </ul>
      </section>

      <aside className="mt-6 border-l-[3px] border-rose-500 bg-rose-50 p-4 text-[15px] leading-relaxed text-rose-900">
        <p>
          <strong>This cannot be undone.</strong> Products, submissions,
          inquiries, and screenshots will be permanently deleted. Vendor
          members will be orphaned (and blocked from re-onboarding, if you
          check that option below). Audit log entries remain — the record of
          this deletion is preserved.
        </p>
      </aside>

      <div className="mt-8">
        <DeleteConfirmForm
          vendorId={impact.vendor.id}
          vendorName={impact.vendor.name}
          memberCount={impact.members.length}
          hasContactEmail={Boolean(impact.vendor.contactEmail)}
          isSelfMember={isSelfMember}
        />
      </div>
    </Container>
  );
}

function ImpactRow({
  icon: Icon,
  count,
  singular,
  plural,
  children,
}: {
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
    className?: string;
  }>;
  count: number;
  singular: string;
  plural: string;
  children?: React.ReactNode;
}) {
  return (
    <li>
      <div className="flex items-baseline gap-2.5">
        <Icon
          size={14}
          weight="regular"
          className="mt-0.5 shrink-0 text-[var(--color-ink-3)]"
        />
        <p className="text-[16px] text-[var(--color-ink)]">
          <span className="num font-medium">{count}</span>{" "}
          {count === 1 ? singular : plural}
        </p>
      </div>
      {children}
    </li>
  );
}
