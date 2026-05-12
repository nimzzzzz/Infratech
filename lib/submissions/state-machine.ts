/**
 * Submission lifecycle state machine. Pure function — no DB, no
 * imports beyond TS types. Unit-testable in isolation; the API
 * routes call `transition()` before any DB write and 409 on
 * InvalidTransitionError.
 *
 * State / transition table (Phase A.2 PR 1; vendor-side transitions
 * land in PR 2):
 *
 *   from                                action                   actor   → to
 *   ─────────────────────────────────── ──────────────────────── ─────── ─────────────────────────────────
 *   pending_review                      admin.approve            admin   → published
 *   pending_review                      admin.edit               admin   → edited_awaiting_vendor_approval
 *   pending_review                      admin.reject             admin   → rejected
 *   edited_awaiting_vendor_approval     vendor.approve           vendor  → published
 *   edited_awaiting_vendor_approval     vendor.request_changes   vendor  → pending_review
 *   rejected                            vendor.resubmit          vendor  → pending_review
 *
 * Every other (from, action) pair is invalid and throws.
 *
 * Status values:
 *   - `pending_review`
 *   - `edited_awaiting_vendor_approval`
 *   - `published`     (terminal happy path)
 *   - `rejected`      (vendor can resubmit)
 *
 * Legacy enum values (`in_review`, `changes_requested`) are reserved
 * in the DB enum for back-compat but no writer emits them post-A.2.
 * The state machine treats them as unknown / no-op for transition
 * purposes.
 */

export type SubmissionStatus =
  | "pending_review"
  | "edited_awaiting_vendor_approval"
  | "published"
  | "rejected"
  // Legacy values — kept so the type matches the DB enum, but no
  // valid transition originates from them.
  | "in_review"
  | "changes_requested";

export type SubmissionAction =
  | "admin.approve"
  | "admin.edit"
  | "admin.reject"
  | "vendor.approve"
  | "vendor.request_changes"
  | "vendor.resubmit";

export type Actor = "admin" | "vendor";

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: SubmissionStatus,
    public readonly action: SubmissionAction,
    public readonly actor: Actor,
  ) {
    super(
      `Invalid transition: ${actor} cannot ${action} a submission in state "${from}"`,
    );
    this.name = "InvalidTransitionError";
  }
}

/** Map of (action) → (required actor, allowed from-states, to-state). */
const TRANSITIONS: Record<
  SubmissionAction,
  { actor: Actor; from: SubmissionStatus[]; to: SubmissionStatus }
> = {
  "admin.approve": {
    actor: "admin",
    from: ["pending_review"],
    to: "published",
  },
  "admin.edit": {
    actor: "admin",
    from: ["pending_review"],
    to: "edited_awaiting_vendor_approval",
  },
  "admin.reject": {
    actor: "admin",
    from: ["pending_review"],
    to: "rejected",
  },
  "vendor.approve": {
    actor: "vendor",
    from: ["edited_awaiting_vendor_approval"],
    to: "published",
  },
  "vendor.request_changes": {
    actor: "vendor",
    from: ["edited_awaiting_vendor_approval"],
    to: "pending_review",
  },
  "vendor.resubmit": {
    actor: "vendor",
    from: ["rejected"],
    to: "pending_review",
  },
};

/**
 * Compute the next status for a submission, or throw if the
 * requested transition is invalid. The caller is responsible for
 * verifying the actor's identity (admin via getAdminSession, vendor
 * via ownership check on submitter_vendor_id) before calling.
 *
 * Concurrency: callers should run the actual UPDATE with a status
 * precondition (`WHERE id = $1 AND status = $expectedFrom`) and
 * treat zero affected rows as a race-condition 409. The state
 * machine is the contract; the SQL precondition is the lock.
 */
export function transition(
  from: SubmissionStatus,
  action: SubmissionAction,
  actor: Actor,
): SubmissionStatus {
  const rule = TRANSITIONS[action];
  if (rule.actor !== actor) throw new InvalidTransitionError(from, action, actor);
  if (!rule.from.includes(from)) throw new InvalidTransitionError(from, action, actor);
  return rule.to;
}

/** Test-only helper: list every (from, action, actor) → to triple. */
export function allValidTransitions(): Array<{
  from: SubmissionStatus;
  action: SubmissionAction;
  actor: Actor;
  to: SubmissionStatus;
}> {
  const out: Array<{
    from: SubmissionStatus;
    action: SubmissionAction;
    actor: Actor;
    to: SubmissionStatus;
  }> = [];
  for (const [action, rule] of Object.entries(TRANSITIONS) as Array<
    [SubmissionAction, (typeof TRANSITIONS)[SubmissionAction]]
  >) {
    for (const from of rule.from) {
      out.push({ from, action, actor: rule.actor, to: rule.to });
    }
  }
  return out;
}
