import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/site/container";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container className="max-w-2xl py-20 md:py-28">
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        404 &middot; Not found
      </p>
      <h1 className="mt-5 font-heading text-[44px] leading-[1.04] tracking-tight md:text-[56px]">
        We don&rsquo;t have a page at that address.
      </h1>
      <p className="mt-6 max-w-[52ch] text-[16px] leading-relaxed text-[var(--color-ink-2)] md:text-[17px]">
        It might have been moved, or the link you followed was wrong. Either way
        &mdash; the directory is one click away.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/browse"
          className="group bloom inline-flex h-12 items-center gap-2 px-5 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition active:translate-y-[1px]"
        >
          Browse the directory
          <ArrowRight size={13} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/suggest"
          className="inline-flex h-12 items-center border border-[var(--color-line-strong)] px-5 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]"
        >
          Suggest a tool
        </Link>
      </div>
    </Container>
  );
}
