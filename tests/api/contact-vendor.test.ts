import { describe, it, expect, vi, beforeEach } from "vitest";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contactMessages, vendors, apps } from "@/lib/db/schema";
import { __resetRateLimitForTests } from "@/lib/email/rate-limit";
import { __resetResendForTests } from "@/lib/email/client";

/**
 * Mock setup.
 *
 * - `next/server.after()` is captured-not-executed so we can drive it
 *   manually after the response returns. Same pattern as the tracking
 *   test (commit 7cadf12).
 *
 * - `resend` is replaced wholesale: `new Resend()` returns a stub whose
 *   `emails.send` is a vi.fn we control per-test. The stub is exposed
 *   via `vi.hoisted` so the mock factory can capture it before any
 *   module-graph evaluation.
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

const resendMock = vi.hoisted(() => ({
  send: vi.fn(async () => ({ data: { id: "mock-msg-id" }, error: null })),
}));
vi.mock("resend", () => {
  // Must be a class / function — Resend is invoked with `new` and
  // arrow-function vi.fn implementations are explicitly not callable
  // as constructors in Vitest 4.
  class MockResend {
    emails = resendMock;
  }
  return { Resend: MockResend };
});

beforeEach(() => {
  afterCallbacks.length = 0;
  resendMock.send.mockReset();
  resendMock.send.mockResolvedValue({ data: { id: "mock-msg-id" }, error: null });
  __resetRateLimitForTests();
  __resetResendForTests();
});

async function getSeededAppContext() {
  const [row] = await db
    .select({
      appId: apps.id,
      slug: apps.slug,
      name: apps.name,
      vendorId: vendors.id,
      vendorName: vendors.name,
      vendorEmail: vendors.contactEmail,
    })
    .from(apps)
    .innerJoin(vendors, eq(vendors.id, apps.vendorId))
    .where(eq(apps.slug, "aconex"))
    .limit(1);
  if (!row) throw new Error("seed must contain 'aconex' app");
  return row;
}

const validBody = (overrides: Record<string, unknown> = {}) => ({
  appSlug: "aconex",
  name: "Hannah Okafor",
  email: "hannah@example.com",
  company: "Bluepoint Constructors",
  role: "Project Manager",
  subject: "Evaluating Aconex for our portfolio",
  message:
    "Hi — we're evaluating document control products for a 3-year programme. Could we book a 30-minute conversation?",
  ...overrides,
});

function makeRequest(body: unknown, ip: string = "10.0.0.1"): Request {
  return new Request("http://localhost/api/contact-vendor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact-vendor — happy path", () => {
  it("200 + inserts contact_messages row + queues both emails via after()", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");
    const ctx = await getSeededAppContext();

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true });

    // DB row landed before response.
    const rows = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.appId, ctx.appId));
    const latest = rows[rows.length - 1];
    expect(latest.senderName).toBe("Hannah Okafor");
    expect(latest.senderEmail).toBe("hannah@example.com");
    expect(latest.senderCompany).toBe("Bluepoint Constructors");
    expect(latest.senderRole).toBe("Project Manager");
    expect(latest.subject).toBe("Evaluating Aconex for our portfolio");
    expect(latest.body).toContain("3-year programme");
    expect(latest.status).toBe("unread");
    expect(latest.vendorId).toBe(ctx.vendorId);

    // Mail not yet sent — after() callback queued, not executed.
    expect(afterCallbacks.length).toBe(1);
    expect(resendMock.send).not.toHaveBeenCalled();

    // Drive the after() callback. Both emails should fire.
    await afterCallbacks[0]();
    expect(resendMock.send).toHaveBeenCalledTimes(2);
  });

  it("vendor email payload: TO contactEmail, BCC inbox, Reply-To visitor, subject auto-built", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");
    const ctx = await getSeededAppContext();

    await POST(makeRequest(validBody()));
    await afterCallbacks[0]();

    // resendMock.send is vi.fn(async () => ...) with no type args; its
    // mock.calls is typed as [][] which strict TS treats as empty tuples.
    // Cast once to the SDK's send-input shape so the assertions read clean.
    type SendArgs = {
      to: string;
      bcc?: string;
      replyTo?: string;
      subject: string;
      html: string;
    };
    const calls = resendMock.send.mock.calls as unknown as Array<[SendArgs]>;
    expect(calls.length).toBe(2);

    // The vendor inquiry has a Reply-To set; the visitor confirmation does not.
    const vendorCall = calls.find((c) => c[0].replyTo)![0];
    expect(vendorCall).toBeDefined();
    expect(vendorCall.to).toBe(ctx.vendorEmail);
    expect(vendorCall.replyTo).toBe("hannah@example.com");
    expect(vendorCall.bcc).toBeTruthy();
    expect(vendorCall.subject).toBe(
      "Inquiry about Aconex from Hannah Okafor",
    );
    // HTML body contains visitor fields + link back to app.
    expect(vendorCall.html).toContain("Hannah Okafor");
    expect(vendorCall.html).toContain("hannah@example.com");
    expect(vendorCall.html).toContain("Bluepoint Constructors");
    expect(vendorCall.html).toContain("Project Manager");
    expect(vendorCall.html).toContain("3-year programme");
    expect(vendorCall.html).toContain("/apps/aconex");
  });

  it("visitor confirmation payload: TO visitor, no Reply-To, subject auto-built", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");

    await POST(makeRequest(validBody()));
    await afterCallbacks[0]();

    type SendArgs = {
      to: string;
      replyTo?: string;
      subject: string;
      html: string;
    };
    const calls = resendMock.send.mock.calls as unknown as Array<[SendArgs]>;
    const visitorCall = calls.find((c) => !c[0].replyTo)![0];
    expect(visitorCall).toBeDefined();
    expect(visitorCall.to).toBe("hannah@example.com");
    expect(visitorCall.subject).toBe("Your message to Oracle was sent");
    expect(visitorCall.html).toContain("Aconex");
    expect(visitorCall.html).toContain("Oracle");
    expect(visitorCall.html).toContain("Hannah");
  });
});

describe("POST /api/contact-vendor — validation", () => {
  it("400 with structured fieldErrors on bad input", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");

    const res = await POST(
      makeRequest({
        appSlug: "aconex",
        name: "",
        email: "not-an-email",
        message: "too short",
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid input");
    expect(json.fieldErrors).toBeDefined();
    expect(json.fieldErrors.name).toBeTruthy();
    expect(json.fieldErrors.email).toBeTruthy();
    expect(json.fieldErrors.message).toBeTruthy();
    // No DB insert, no after() queued.
    expect(afterCallbacks).toHaveLength(0);
    expect(resendMock.send).not.toHaveBeenCalled();
  });

  it("400 on malformed JSON body", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");

    const req = new Request("http://localhost/api/contact-vendor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.99",
      },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects message > 5000 chars", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");

    const res = await POST(makeRequest(validBody({ message: "x".repeat(5001) })));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/contact-vendor — lookup failures", () => {
  it("404 on unknown slug", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");

    const res = await POST(
      makeRequest(validBody({ appSlug: "no-such-tool" })),
    );
    expect(res.status).toBe(404);
    expect(afterCallbacks).toHaveLength(0);
  });

  it("404 on draft (unpublished) app — doesn't leak draft state", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");
    // Demote one seeded app to draft inside the test tx.
    await db
      .update(apps)
      .set({ status: "draft" })
      .where(eq(apps.slug, "aconex"));

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(404);
  });

  it("503 when vendor is suspended", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");
    await db
      .update(vendors)
      .set({ suspended: true })
      .where(eq(vendors.slug, "oracle"));

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/not currently accepting/i);
    expect(afterCallbacks).toHaveLength(0);
  });

  it("503 when vendor has no contact_email", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");
    await db
      .update(vendors)
      .set({ contactEmail: null })
      .where(eq(vendors.slug, "oracle"));

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(503);
  });
});

describe("POST /api/contact-vendor — honeypot", () => {
  it("filled honeypot → 200 success but no DB insert + no email send", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");
    const ctx = await getSeededAppContext();
    const before = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(contactMessages)
      .where(eq(contactMessages.appId, ctx.appId));

    const res = await POST(
      makeRequest(validBody({ website: "https://spammer.example/" })),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const after = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(contactMessages)
      .where(eq(contactMessages.appId, ctx.appId));
    expect(after[0].n).toBe(before[0].n);
    expect(afterCallbacks).toHaveLength(0);
    expect(resendMock.send).not.toHaveBeenCalled();
  });
});

describe("POST /api/contact-vendor — rate limiting", () => {
  it("6th submission from same IP within the hour returns 429", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");
    const ip = "10.0.0.123";

    for (let i = 0; i < 5; i++) {
      const r = await POST(makeRequest(validBody(), ip));
      expect(r.status).toBe(200);
    }
    const sixth = await POST(makeRequest(validBody(), ip));
    expect(sixth.status).toBe(429);
    const json = await sixth.json();
    expect(json.error).toMatch(/too many/i);
  });

  it("different IPs have independent buckets", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest(validBody(), "10.0.0.200"));
    }
    const other = await POST(makeRequest(validBody(), "10.0.0.201"));
    expect(other.status).toBe(200);
  });
});

describe("POST /api/contact-vendor — email failure tolerance", () => {
  it("Resend send failure for vendor email is logged but doesn't break the inquiry — DB row still present, 200 already returned", async () => {
    const { POST } = await import("@/app/api/contact-vendor/route");
    const ctx = await getSeededAppContext();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // First call (vendor) rejects, second call (visitor) resolves —
    // covers the "one of two failed" branch in send-contact.ts.
    resendMock.send
      .mockRejectedValueOnce(new Error("Resend 503"))
      .mockResolvedValueOnce({ data: { id: "ok" }, error: null });

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);

    // DB row exists — inquiry survived even though mail failed.
    const rows = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.appId, ctx.appId));
    expect(rows.length).toBeGreaterThan(0);

    await afterCallbacks[0]();
    // Both sends were attempted; one failed.
    expect(resendMock.send).toHaveBeenCalledTimes(2);
    errSpy.mockRestore();
  });
});
