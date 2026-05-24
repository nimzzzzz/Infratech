import { cn } from "@/lib/utils";

const WORDS = [
  { word: "all", accent: "a", rest: "ll" },
  { word: "infra", accent: "i", rest: "nfra" },
  { word: "tech", accent: "t", rest: "ech" },
] as const;

type AllInfratechWordmarkProps = {
  className?: string;
  accentClassName?: string;
};

export function AllInfratechWordmark({
  className,
  accentClassName,
}: AllInfratechWordmarkProps) {
  return (
    <span
      aria-label="all infra tech"
      className={cn(
        "font-heading text-[18px] italic tracking-normal text-[var(--color-ink)]",
        className,
        "leading-[0.82]",
      )}
    >
      {WORDS.map(({ word, accent, rest }) => (
        <span key={word} data-allinfratech-word className="block">
          <span
            data-allinfratech-accent
            className={cn("text-[var(--color-coral)]", accentClassName)}
          >
            {accent}
          </span>
          {rest}
        </span>
      ))}
    </span>
  );
}
