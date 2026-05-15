import { Container } from "./container";
import { InnerHero } from "./inner-hero";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <InnerHero
        eyebrow="Legal"
        title={<>{title}</>}
        body={
          <p
            className="text-[16px] uppercase tracking-[0.16em] text-[var(--color-ink-3)]"
            dangerouslySetInnerHTML={{ __html: `Last updated: ${updated}` }}
          />
        }
      />
      <section className="bg-[var(--color-canvas)] pb-24 md:pb-32">
        <Container className="max-w-[68ch]">
          <div className="space-y-5 text-[18px] leading-relaxed text-[var(--color-ink-2)] md:text-[19px]">
            {children}
          </div>
        </Container>
      </section>
    </>
  );
}
