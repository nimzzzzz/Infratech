import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Per-resource cache invalidation helpers.
 *
 * Each helper invalidates every page that depends on the resource — when
 * an app changes, the home page (the directory tool itself), /apps/[slug],
 * the vendor's profile, and every stage / capability the app is tagged
 * with all become stale.
 *
 * For broad invalidation we lean on revalidatePath rather than
 * revalidateTag since we haven't tagged fetches anywhere yet. Stage 7
 * perf review can switch to per-tag invalidation if the over-revalidation
 * starts hurting.
 *
 * ─── THE TWO-LAYER POST-MUTATION FRESHNESS RULE ───
 *
 * Next.js App Router has two caches that matter after a mutation:
 *
 *   1. Full Route Cache (SERVER) — cleared by revalidatePath() from any
 *      server context, including API routes.
 *   2. Router Cache (CLIENT, in-memory) — RSC payloads cached during
 *      client-side navigation. NOT cleared by revalidatePath() from an
 *      API route. Cleared by router.refresh() OR by Server Actions
 *      calling revalidatePath() (Next.js wires that through
 *      automatically; API routes don't get that integration).
 *
 * Because we mutate via API routes (POST fetch from client components),
 * BOTH layers need explicit invalidation or the user sees stale data
 * after a soft navigation:
 *
 *   • SERVER side: every mutation API route must call revalidatePath()
 *     — use the helpers below where they fit (revalidateApp,
 *     revalidateVendor, revalidateAppListings); coarse
 *     revalidatePath("/", "layout") otherwise; surgical for high-volume
 *     routes (e.g. /api/contact-vendor → just /dashboard/messages).
 *
 *   • CLIENT side: every post-mutation handler in a client component
 *     must call router.refresh(). If it also navigates, the order is
 *     push-then-refresh, NEVER refresh-then-push. router.refresh()
 *     invalidates the current segment's Router Cache entry; if you
 *     push first, "current" is the destination (correct); if you
 *     refresh first, "current" is the page you're leaving (the refresh
 *     is wasted on a soon-to-unmount page).
 *
 *     Pattern:
 *
 *       const res = await fetch(url, { method: "POST", body: ... });
 *       if (res.ok) {
 *         // ...handle response data
 *         router.push(target);   // navigate first
 *         router.refresh();      // refresh the destination
 *       }
 *
 *     For staying on the same page (modal closes / banner appears),
 *     just router.refresh() — no push.
 *
 * Long-term, migrating mutations from API routes to Server Actions
 * eliminates the client-side leg of this rule (Server Actions integrate
 * Router Cache invalidation automatically). Tracked in BACKLOG.
 */

export function revalidateApp(slug: string): void {
  revalidatePath(`/apps/${slug}`);
  revalidatePath("/");
  // Sitemap regen so newly-published / unpublished apps stop appearing
  // in indexable URL set.
  revalidatePath("/sitemap.xml");
}

/** Stage and capability landing pages list this app — invalidate them too. */
export function revalidateAppListings(stageSlugs: string[], capabilitySlugs: string[]): void {
  for (const s of stageSlugs) revalidatePath(`/stages/${s}`);
  for (const c of capabilitySlugs) revalidatePath(`/capabilities/${c}`);
}

export function revalidateVendor(slug: string): void {
  revalidatePath(`/vendors/${slug}`);
  revalidatePath("/sitemap.xml");
}

export function revalidateStage(slug: string): void {
  revalidatePath(`/stages/${slug}`);
  revalidatePath("/");
}

export function revalidateCapability(slug: string): void {
  revalidatePath(`/capabilities/${slug}`);
  revalidatePath("/");
}

/** Reserved for Stage 7 if/when we tag-based invalidation. */
export function revalidateByTag(tag: string): void {
  revalidateTag(tag);
}
