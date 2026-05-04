import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { QueueList } from "@/components/admin/queue-list";
import { queue } from "@/lib/data/admin-queue";

export const metadata: Metadata = {
  title: "Admin · Queue",
  alternates: { canonical: "/admin/queue" },
};

const TARGET_REVIEW_DAYS = 2;

export default function AdminQueuePage() {
  const total = queue.length;
  const pending = queue.filter((s) => s.status === "pending").length;
  return (
    <Container className="max-w-6xl py-10 md:py-14">
      <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        &sect; Review queue
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
