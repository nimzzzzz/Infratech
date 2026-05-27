import { DocumentToc, type TocEntry } from "./document-toc";

export type DocumentSection = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export function DocumentLayout({
  eyebrow,
  title,
  lastUpdated,
  version,
  sections,
}: {
  eyebrow: string;
  title: string;
  lastUpdated?: string;
  version?: string;
  sections: DocumentSection[];
}) {
  const tocEntries: TocEntry[] = sections.map((s) => ({
    id: s.id,
    label: s.label,
  }));

  return (
    <section className="bg-[var(--color-canvas)] pb-24 pt-12 md:pb-32 md:pt-16">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 md:px-8">
        <div className="grid gap-10 md:grid-cols-[200px_1fr]">
          <DocumentToc sections={tocEntries} />

          <article className="min-w-0 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-8 md:px-10 md:py-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-coral)]">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-heading text-[28px] leading-tight tracking-tight text-[var(--color-ink)] md:text-[32px]">
              {title}
            </h1>
            {lastUpdated ? (
              <p className="mt-2 text-[13px] text-[var(--color-ink-3)]">
                Last updated: {lastUpdated}
                {version ? ` · Version ${version}` : ""}
              </p>
            ) : null}
            <hr className="mt-4 border-t border-[var(--color-line)]" />

            <div className="mt-8 space-y-10">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="font-heading text-[18px] font-medium leading-tight text-[var(--color-ink)] md:text-[20px]">
                    {s.label}
                  </h2>
                  <div className="mt-3 space-y-4 text-[15px] leading-[1.7] text-[var(--color-ink-2)] md:text-[16px]">
                    {s.content}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
