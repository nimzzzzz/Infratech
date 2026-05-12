import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { SubmissionList } from "@/components/admin/submissions/submission-list";
import { getAdminSession } from "@/lib/auth/admin-session";
import { listSubmissionsForAdmin } from "@/lib/queries/submissions";
import type { SubmissionStatus } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Admin · Submissions",
  alternates: { canonical: "/admin/submissions" },
};

const VALID_TABS = new Set([
  "queue",
  "published",
  "rejected",
  "all",
]);

type TabKey = "queue" | "published" | "rejected" | "all";

function statusesForTab(tab: TabKey): SubmissionStatus[] {
  switch (tab) {
    case "published":
      return ["published"];
    case "rejected":
      return ["rejected"];
    case "all":
      return [
        "pending_review",
        "edited_awaiting_vendor_approval",
        "published",
        "rejected",
      ];
    case "queue":
    default:
      return ["pending_review", "edited_awaiting_vendor_approval"];
  }
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await getAdminSession();
  const sp = await searchParams;
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: TabKey = VALID_TABS.has(tabParam ?? "")
    ? (tabParam as TabKey)
    : "queue";
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";

  const rows = await listSubmissionsForAdmin({
    statuses: statusesForTab(tab),
    q: q || undefined,
  });

  return (
    <Container className="max-w-6xl py-12 md:py-16">
      <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Editorial admin
      </p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <h1 className="font-heading text-[36px] leading-[1.04] tracking-tight md:text-[44px]">
          Submissions
        </h1>
        <Link
          href="/admin"
          className="group inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
        >
          Overview
          <ArrowRight
            size={11}
            weight="bold"
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <SubmissionList rows={rows} activeTab={tab} q={q} />
    </Container>
  );
}
