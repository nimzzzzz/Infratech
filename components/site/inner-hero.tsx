import { Container } from "./container";

export function InnerHero({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <section className="relative overflow-hidden bg-[var(--color-canvas)] pb-12 pt-32 md:pb-16 md:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[420px] opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(214,51,108,0.18), rgba(249,115,22,0.10) 50%, transparent 75%)",
        }}
      />
      <Container className={align === "center" ? "text-center" : ""}>
        <p className="text-[14px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          {eyebrow}
        </p>
        <h1 className="mt-5 max-w-[22ch] text-[44px] leading-[1.04] tracking-tight md:text-[72px]">
          {title}
        </h1>
        {body ? (
          <div className="mt-6 max-w-[60ch] text-[18px] leading-relaxed text-[var(--color-ink-2)] md:text-[20px]">
            {body}
          </div>
        ) : null}
      </Container>
    </section>
  );
}
