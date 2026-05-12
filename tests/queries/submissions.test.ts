import { describe, it, expect } from "vitest";
import {
  listSubmissions,
  getSubmissionById,
  listSuggestions,
} from "@/lib/queries/submissions";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

describe("submission queries", () => {
  it("listSubmissions returns the 5 seeded submissions ordered by submittedAt desc", async () => {
    const subs = await listSubmissions();
    expect(subs.length).toBe(5);
    for (let i = 1; i < subs.length; i++) {
      expect(subs[i - 1].submittedAt.getTime()).toBeGreaterThanOrEqual(
        subs[i].submittedAt.getTime(),
      );
    }
  });

  it("listSubmissions filters by status", async () => {
    const pending = await listSubmissions({ status: "pending_review" });
    for (const s of pending) expect(s.status).toBe("pending_review");
  });

  it("getSubmissionById returns full submission + submitter", async () => {
    const all = await listSubmissions();
    const first = all[0];
    const detail = await getSubmissionById(first.id);
    expect(detail?.id).toBe(first.id);
    expect(detail?.submitter).toBeDefined();
  });

  it("getSubmissionById returns null for unknown id", async () => {
    const detail = await getSubmissionById(999999999);
    expect(detail).toBeNull();
  });

  it("listSuggestions returns empty when none seeded", async () => {
    const sugs = await listSuggestions();
    expect(sugs).toEqual([]);
  });

  it("listSuggestions returns inserted rows in createdAt desc", async () => {
    await db.execute(sql`
      INSERT INTO suggestions (submitter_name, submitter_email, app_name, app_url, reason, status, created_at)
      VALUES
        ('A', 'a@example.com', 'Tool A', 'https://a.example.com', 'because', 'new', '2026-01-01T00:00:00Z'),
        ('B', 'b@example.com', 'Tool B', 'https://b.example.com', 'because', 'new', '2026-02-01T00:00:00Z')
    `);
    const sugs = await listSuggestions();
    expect(sugs.length).toBe(2);
    expect(sugs[0].appName).toBe("Tool B");
    expect(sugs[1].appName).toBe("Tool A");
  });
});
