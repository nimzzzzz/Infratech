"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PendingDashboardLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  href: LinkProps["href"];
  prefetch?: LinkProps["prefetch"];
  pendingLabel?: string;
};

export function PendingDashboardLink({
  href,
  prefetch = true,
  pendingLabel = "Loading",
  className,
  children,
  onClick,
  ...props
}: PendingDashboardLinkProps) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  return (
    <Link
      {...props}
      href={href}
      prefetch={prefetch}
      aria-busy={pending}
      data-pending={pending ? "true" : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        setPending(true);
      }}
      className={cn(
        className,
        pending && "pointer-events-none opacity-60",
      )}
    >
      {children}
      <span className="sr-only" aria-live="polite">
        {pending ? pendingLabel : ""}
      </span>
    </Link>
  );
}
