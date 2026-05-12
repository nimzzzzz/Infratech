import { describe, it, expect } from "vitest";
import {
  transition,
  InvalidTransitionError,
  allValidTransitions,
  type SubmissionAction,
  type SubmissionStatus,
  type Actor,
} from "@/lib/submissions/state-machine";

describe("submission state machine — valid transitions", () => {
  // Sanity check: every entry in the published transition table
  // should round-trip through transition() and return the to-state.
  for (const { from, action, actor, to } of allValidTransitions()) {
    it(`${actor} can ${action} from ${from} → ${to}`, () => {
      expect(transition(from, action, actor)).toBe(to);
    });
  }
});

describe("submission state machine — invalid transitions throw", () => {
  // Actor mismatches.
  const actorMismatches: Array<[SubmissionAction, Actor]> = [
    ["admin.approve", "vendor"],
    ["admin.edit", "vendor"],
    ["admin.reject", "vendor"],
    ["vendor.approve", "admin"],
    ["vendor.request_changes", "admin"],
    ["vendor.resubmit", "admin"],
  ];
  for (const [action, wrongActor] of actorMismatches) {
    it(`${wrongActor} cannot perform ${action}`, () => {
      expect(() => transition("pending_review", action, wrongActor)).toThrow(
        InvalidTransitionError,
      );
    });
  }

  // From-state mismatches.
  const fromMismatches: Array<[SubmissionStatus, SubmissionAction, Actor]> = [
    ["published", "admin.approve", "admin"], // terminal
    ["published", "admin.edit", "admin"], // terminal
    ["published", "admin.reject", "admin"], // terminal
    ["rejected", "admin.approve", "admin"], // rejected → can't approve, must resubmit
    ["rejected", "vendor.approve", "vendor"], // wrong path
    ["pending_review", "vendor.approve", "vendor"], // vendor can only approve after admin edits
    ["pending_review", "vendor.resubmit", "vendor"], // resubmit only from rejected
    ["edited_awaiting_vendor_approval", "admin.approve", "admin"], // admin can't unilaterally re-approve here
    ["edited_awaiting_vendor_approval", "admin.reject", "admin"], // admin's window already closed
  ];
  for (const [from, action, actor] of fromMismatches) {
    it(`${actor} cannot ${action} from ${from}`, () => {
      expect(() => transition(from, action, actor)).toThrow(
        InvalidTransitionError,
      );
    });
  }

  // Legacy enum values are accepted as inputs (so a seeded row
  // doesn't crash) but produce no valid transition.
  it("legacy in_review state has no valid transitions", () => {
    expect(() => transition("in_review", "admin.approve", "admin")).toThrow(
      InvalidTransitionError,
    );
  });
});

describe("InvalidTransitionError shape", () => {
  it("carries from / action / actor for the API route to surface", () => {
    try {
      transition("published", "admin.approve", "admin");
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidTransitionError);
      if (err instanceof InvalidTransitionError) {
        expect(err.from).toBe("published");
        expect(err.action).toBe("admin.approve");
        expect(err.actor).toBe("admin");
      }
    }
  });
});
