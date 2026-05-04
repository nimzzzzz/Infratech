/**
 * Compute a short relative-time label like "3d ago", "2w ago", "4mo ago"
 * from an ISO date string. Reference date is "today" for deterministic
 * SSR; swap for `new Date()` once the catalogue starts taking real submissions.
 */
const REFERENCE_NOW = new Date("2026-05-02T00:00:00Z");

export function relativeDays(isoDate: string): {
  days: number;
  label: string;
} {
  const then = new Date(`${isoDate}T00:00:00Z`);
  const ms = REFERENCE_NOW.getTime() - then.getTime();
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  let label: string;
  if (days === 0) label = "today";
  else if (days < 7) label = `${days}d ago`;
  else if (days < 30) label = `${Math.floor(days / 7)}w ago`;
  else if (days < 365) label = `${Math.floor(days / 30)}mo ago`;
  else label = `${Math.floor(days / 365)}y ago`;
  return { days, label };
}

export function countAddedWithin(
  isoDates: string[],
  withinDays: number,
): number {
  return isoDates.filter((d) => relativeDays(d).days <= withinDays).length;
}

export function nowReference(): Date {
  return REFERENCE_NOW;
}
