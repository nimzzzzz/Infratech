import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";
import { SubmissionDetail } from "@/components/admin/submissions/submission-detail";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getSubmissionForAdmin } from "@/lib/queries/submissions";

export const metadata: Metadata = {
  title: "Admin · Submission",
  alternates: { canonical: "/admin/submissions" },
};

export default async function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getAdminSession();
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const submission = await getSubmissionForAdmin(id);
  if (!submission) notFound();

  return (
    <Container className="max-w-4xl py-10 md:py-14">
      <Link
        href="/admin/submissions"
        className="group inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft
          size={12}
          weight="bold"
          className="transition-transform duration-300 group-hover:-translate-x-0.5"
        />
        Back to submissions
      </Link>

      <SubmissionDetail submission={submission} />
    </Container>
  );
}
