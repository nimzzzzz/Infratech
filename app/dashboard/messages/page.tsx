import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/site/container";
import { messagesForVendor, unreadCount } from "@/lib/data/messages";
import { relativeDays } from "@/lib/browse/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inbox",
  alternates: { canonical: "/dashboard/messages" },
};

const VENDOR_SLUG = "arctus";

export default async function MessagesInboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filterParam = Array.isArray(sp.filter) ? sp.filter[0] : sp.filter;
  const all = messagesForVendor(VENDOR_SLUG)
    .slice()
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const unread = unreadCount(VENDOR_SLUG);
  const filter = filterParam === "unread" ? "unread" : "all";
  const list = filter === "unread" ? all.filter((m) => m.status === "unread") : all;

  return (
    <Container className="max-w-6xl py-10 md:py-14">
      <p className="text-[12px] uppercase tracking-[0.32em] text-[var(--color-coral)]">
        &sect; Inbox
      </p>
      <h1 className="mt-4 font-heading text-[36px] leading-[1.04] tracking-tight md:text-[52px]">
        Inquiries from visitors.
      </h1>
      <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-[var(--color-ink-2)] md:text-[14px]">
        Sent through the &ldquo;Contact vendor&rdquo; form on your product pages.
        Reply directly via email &mdash; the visitor&rsquo;s address is on each
        message.
      </p>

      {/* filter tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-0 border border-[var(--color-line-strong)] p-1">
        <FilterTab
          href="/dashboard/messages"
          active={filter === "all"}
          label={`All (${all.length})`}
        />
        <FilterTab
          href="/dashboard/messages?filter=unread"
          active={filter === "unread"}
          label={`Unread (${unread})`}
        />
      </div>

      {/* list */}
      <ul className="mt-6 border-y border-[var(--color-line)] divide-y divide-[var(--color-line)]">
        {list.length === 0 ? (
          <li className="py-12 text-center text-[14px] text-[var(--color-ink-3)]">
            {filter === "unread"
              ? "Nothing unread. Inbox zero."
              : "No inquiries yet."}
          </li>
        ) : (
          list.map((msg) => (
            <li key={msg.id}>
              <Link
                href={`/dashboard/messages/${msg.id}`}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-5 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_88px] md:gap-6 md:px-3"
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    msg.status === "unread"
                      ? "bg-[var(--color-coral)]"
                      : "bg-[var(--color-line-strong)]",
                  )}
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[15px] leading-tight md:text-[16px]",
                      msg.status === "unread"
                        ? "font-medium text-[var(--color-ink)]"
                        : "text-[var(--color-ink-2)]",
                    )}
                  >
                    {msg.subject}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-[var(--color-ink-3)]">
                    {msg.from.name}
                    {msg.from.company ? ` · ${msg.from.company}` : ""}
                    {msg.from.role ? ` · ${msg.from.role}` : ""}
                  </p>
                </div>
                <p className="hidden truncate text-[12px] uppercase tracking-[0.16em] text-[var(--color-coral)] md:block">
                  {msg.appName}
                </p>
                <p className="hidden truncate text-[12px] text-[var(--color-ink-2)] md:block">
                  {snippet(msg.body)}
                </p>
                <span className="num text-right text-[11px] text-[var(--color-ink-3)]">
                  {relativeDays(msg.receivedAt.slice(0, 10)).label}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </Container>
  );
}

function FilterTab({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors",
        active
          ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
          : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
      )}
    >
      {label}
    </Link>
  );
}

function snippet(body: string, len = 110): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > len ? `${oneLine.slice(0, len)}…` : oneLine;
}
