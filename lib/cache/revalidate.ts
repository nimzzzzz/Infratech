import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Per-resource cache invalidation helpers.
 *
 * Stage 4 (vendor publish flow) and Stage 5 (admin moderation) call these
 * after a write that should be visible immediately rather than waiting
 * for the ISR window. Stage 2 just creates the helpers — no call sites
 * yet.
 *
 * Each helper invalidates every page that depends on the resource — when
 * an app changes, the home page (latest + featured), /browse (counts),
 * /apps/[slug], the vendor's profile, and every stage / capability the
 * app is tagged with all become stale.
 *
 * For broad invalidation we lean on revalidatePath rather than
 * revalidateTag since we haven't tagged fetches anywhere yet. Stage 7
 * perf review can switch to per-tag invalidation if the over-revalidation
 * starts hurting.
 */

export function revalidateApp(slug: string): void {
  revalidatePath(`/apps/${slug}`);
  revalidatePath("/");
  revalidatePath("/browse");
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
  revalidatePath("/browse");
}

export function revalidateCapability(slug: string): void {
  revalidatePath(`/capabilities/${slug}`);
  revalidatePath("/browse");
}

/** Reserved for Stage 7 if/when we tag-based invalidation. */
export function revalidateByTag(tag: string): void {
  revalidateTag(tag);
}
