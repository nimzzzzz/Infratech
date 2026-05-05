import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { QueueList } from "@/components/admin/queue-list";
import { getAdminSession } from "@/lib/auth/admin-session";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import type { Submission as MockSubmission } from "@/lib/data/admin-queue";

export const metadata: Metadata = {
  title: "Admin · Queue",
  alternates: { canonical: "/admin/queue" },
};

const TARGET_REVIEW_DAYS = 2;

export default async function AdminQueuePage() {
  await getAdminSession();

  // Pull payloads — Stage 5 will replace this with a typed query that
  // returns DB-shaped submissions and update the QueueList component.
  // For now, the seed put the original mock objects into payload jsonb,
  // so we cast back to the legacy shape the existing component reads.
  const rows = await db.select().from(submissions).orderBy(submissions.submittedAt);
  const queue = rows.map((r) => ({
    ...(r.payload as MockSubmission),
    id: String(r.id),
  }));

  const total = queue.length;
  const pending = queue.filter((s) => s.status === "pending").length;

  return (
    <Container className="max-w-6xl py-10 md:py-14">
      <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        Review queue
      </p>
      <h1 className="mt-4 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[52px]">
        Vendor submissions.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-[var(--color-ink-2)] md:text-[14px]">
        <span className="num text-[var(--color-ink)]">{pending}</span> awaiting
        first review &middot;{" "}
        <span className="num text-[var(--color-ink)]">{total}</span> in the
        queue total &middot; aim for{" "}
        <span className="num">{TARGET_REVIEW_DAYS}</span>-day turnaround.
      </p>

      <div className="mt-10">
        <QueueList items={queue} />
      </div>
    </Container>
  );
}
