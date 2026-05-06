import { describe, it, expect, vi, beforeEach } from "vitest";
import { sql, eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appViews, outboundClicks, apps } from "@/lib/db/schema";

/**
 * Capture-not-execute mock for next/server.after().
 *
 * The real after() schedules a callback to run AFTER the response is
 * sent. We need to:
 *   - Verify the response is returned BEFORE the callback runs (ordering).
 *   - Drive the callback ourselves so DB writes happen on the test tx.
 *
 * The single afterCallbacks array collects everything queued during a
 * test; reset in beforeEach.
 */
const afterCallbacks: Array<() => unknown | Promise<unknown>> = [];
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((fn: () => unknown | Promise<unknown>) => {
      afterCallbacks.push(fn);
    }),
  };
});

beforeEach(() => {
  afterCallbacks.length = 0;
});

async function getSeededAppId(): Promise<number> {
  const rows = await db.select({ id: apps.id }).from(apps).limit(1);
  if (!rows[0]) throw new Error("seed must contain at least one app");
  return rows[0].id;
}

describe("GET /api/clicks/[appId]", () => {
  it("returns 302 to the target with a Location header", async () => {
    const { GET } = await import("@/app/api/clicks/[appId]/route");
    const id = await getSeededAppId();
    const target = "https://example.com/landing";
    const res = await GET(
      new Request(`http://localhost/api/clicks/${id}?to=${encodeURIComponent(target)}`),
      { params: Promise.resolve({ appId: String(id) }) },
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(target);
  });

  it("redirect fires BEFORE the DB write (response returns; after() is queued, not yet run)", async () => {
    const { GET } = await import("@/app/api/clicks/[appId]/route");
    const id = await getSeededAppId();
    const before = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(outboundClicks)
      .where(eq(outboundClicks.appId, id));
    const beforeCount = before[0]?.n ?? 0;

    const res = await GET(
      new Request(`http://localhost/api/clicks/${id}?to=https://example.com/`),
      { params: Promise.resolve({ appId: String(id) }) },
    );
    expect(res.status).toBe(302);

    // after() callback was queued but hasn't run yet — DB count unchanged.
    const mid = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(outboundClicks)
      .where(eq(outboundClicks.appId, id));
    expect(mid[0]?.n ?? 0).toBe(beforeCount);
    expect(afterCallbacks.length).toBe(1);

    // Drive the queued callback — now the row lands.
    await afterCallbacks[0]();
    const post = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(outboundClicks)
      .where(eq(outboundClicks.appId, id));
    expect(post[0]?.n ?? 0).toBe(beforeCount + 1);
  });

  it("captures user-agent and referer headers into the row", async () => {
    const { GET } = await import("@/app/api/clicks/[appId]/route");
    const id = await getSeededAppId();
    const req = new Request(`http://localhost/api/clicks/${id}?to=https://example.com/`, {
      headers: {
        "user-agent": "test-ua/1.0",
        referer: "https://referrer.example/",
      },
    });
    await GET(req, { params: Promise.resolve({ appId: String(id) }) });
    await afterCallbacks[0]();
    const rows = await db
      .select()
      .from(outboundClicks)
      .where(eq(outboundClicks.appId, id));
    const latest = rows[rows.length - 1];
    expect(latest.userAgent).toBe("test-ua/1.0");
    expect(latest.referrer).toBe("https://referrer.example/");
  });

  it("400 when appId is not numeric", async () => {
    const { GET } = await import("@/app/api/clicks/[appId]/route");
    const res = await GET(
      new Request("http://localhost/api/clicks/not-a-number?to=https://example.com/"),
      { params: Promise.resolve({ appId: "not-a-number" }) },
    );
    expect(res.status).toBe(400);
  });

  it("400 when ?to is missing", async () => {
    const { GET } = await import("@/app/api/clicks/[appId]/route");
    const res = await GET(
      new Request("http://localhost/api/clicks/1"),
      { params: Promise.resolve({ appId: "1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("400 when ?to is malformed", async () => {
    const { GET } = await import("@/app/api/clicks/[appId]/route");
    const res = await GET(
      new Request("http://localhost/api/clicks/1?to=not-a-url"),
      { params: Promise.resolve({ appId: "1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("400 for disallowed schemes (javascript:, data:, file:)", async () => {
    const { GET } = await import("@/app/api/clicks/[appId]/route");
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,<script>x</script>",
      "file:///etc/passwd",
    ]) {
      const res = await GET(
        new Request(`http://localhost/api/clicks/1?to=${encodeURIComponent(bad)}`),
        { params: Promise.resolve({ appId: "1" }) },
      );
      expect(res.status).toBe(400);
    }
  });

  it("DB write failure (FK violation) doesn't break the 302 — error swallowed in after()", async () => {
    const { GET } = await import("@/app/api/clicks/[appId]/route");
    // appId 9_999_999 has no matching apps row → FK violation when the
    // after() callback runs. The 302 was already returned synchronously.
    const res = await GET(
      new Request("http://localhost/api/clicks/9999999?to=https://example.com/"),
      { params: Promise.resolve({ appId: "9999999" }) },
    );
    expect(res.status).toBe(302);
    // Suppress the expected console.error from the route's try/catch.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(afterCallbacks[0]()).resolves.toBeUndefined();
    errSpy.mockRestore();
  });
});

async function viewsCountToday(appId: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(appViews)
    .where(and(eq(appViews.appId, appId), eq(appViews.day, today)));
  return rows[0]?.count ?? 0;
}

describe("POST /api/views/[appId]", () => {
  it("204 + UPSERT increments app_views by 1 on first call", async () => {
    const { POST } = await import("@/app/api/views/[appId]/route");
    const id = await getSeededAppId();
    const before = await viewsCountToday(id);

    const res = await POST(
      new Request(`http://localhost/api/views/${id}`, { method: "POST" }),
      { params: Promise.resolve({ appId: String(id) }) },
    );
    expect(res.status).toBe(204);
    expect(await viewsCountToday(id)).toBe(before + 1);
  });

  it("two sequential calls increment by 2 (UPSERT)", async () => {
    const { POST } = await import("@/app/api/views/[appId]/route");
    const id = await getSeededAppId();
    const before = await viewsCountToday(id);

    for (let i = 0; i < 2; i++) {
      await POST(
        new Request(`http://localhost/api/views/${id}`, { method: "POST" }),
        { params: Promise.resolve({ appId: String(id) }) },
      );
    }
    expect(await viewsCountToday(id)).toBe(before + 2);
  });

  it("five concurrent calls increment by 5 (no row lost to race)", async () => {
    const { POST } = await import("@/app/api/views/[appId]/route");
    const id = await getSeededAppId();
    const before = await viewsCountToday(id);

    await Promise.all(
      Array.from({ length: 5 }, () =>
        POST(
          new Request(`http://localhost/api/views/${id}`, { method: "POST" }),
          { params: Promise.resolve({ appId: String(id) }) },
        ),
      ),
    );
    expect(await viewsCountToday(id)).toBe(before + 5);
  });

  it("400 when appId is not numeric (no DB write attempted)", async () => {
    const { POST } = await import("@/app/api/views/[appId]/route");
    const res = await POST(
      new Request("http://localhost/api/views/junk", { method: "POST" }),
      { params: Promise.resolve({ appId: "junk" }) },
    );
    expect(res.status).toBe(400);
  });

  it("DB failure (FK violation) is swallowed — still returns 204", async () => {
    const { POST } = await import("@/app/api/views/[appId]/route");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(
      new Request("http://localhost/api/views/9999999", { method: "POST" }),
      { params: Promise.resolve({ appId: "9999999" }) },
    );
    expect(res.status).toBe(204);
    errSpy.mockRestore();
  });
});
