import { redirect } from "next/navigation";

/**
 * Legacy /admin/queue → /admin/submissions redirect. Phase A.2
 * renamed the route to align with the spec's terminology and the
 * new state machine. Old bookmarks / deep links from the admin
 * header's prior nav entry still resolve.
 *
 * The previous page used the deprecated MockSubmission shape; both
 * its real-data crash (mirror of /admin/page.tsx's bug) and its
 * non-existence in the new nav are handled here in one move.
 */
export default function AdminQueueRedirect() {
  redirect("/admin/submissions");
}
