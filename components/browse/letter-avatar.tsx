import { cn } from "@/lib/utils";

export function LetterAvatar({
  name,
  className,
  letterClassName,
}: {
  name: string;
  className?: string;
  /** Override the default text-[24px] italic letter sizing (e.g. for larger avatars). */
  letterClassName?: string;
}) {
  const letter = name.trim().charAt(0);
  // lowercase letters look more academic / library-card-like
  const display = letter.match(/[a-z]/i) ? letter : letter.toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-12 w-12 place-items-center border border-[var(--color-line-strong)] bg-[var(--color-canvas)]",
        className,
      )}
    >
      <span
        className={cn(
          "font-heading text-[24px] italic leading-none text-[var(--color-ink)]",
          letterClassName,
        )}
      >
        {display}
      </span>
    </span>
  );
}
