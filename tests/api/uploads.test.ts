import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Phase C PR 1 — /api/uploads route tests.
 *
 * Scope: the route's validation + auth boundaries. The Vercel
 * Blob client is mocked — we don't talk to the real store from
 * the test suite. Happy-path assertions verify the key layout
 * (scope/vendor_id/timestamp-random.ext) so a future cleanup job
 * keyed on the vendor prefix has the contract it expects.
 */

vi.mock("@/lib/auth/session", () => ({
  getVendorSession: vi.fn().mockResolvedValue({
    vendor: { id: 42, name: "Acme" },
    vendorMember: { id: 7 },
    user: { id: "user_x", name: "X", email: "x@x" },
  }),
}));

const putMock = vi.fn();
vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => putMock(...args),
}));

vi.mock("@/lib/env", () => ({
  env: {
    blob: () => ({ BLOB_READ_WRITE_TOKEN: "test_token" }),
  },
}));

import { POST } from "@/app/api/uploads/route";

beforeEach(() => {
  putMock.mockReset();
});

function makeRequest(form: FormData): Request {
  return new Request("http://localhost/api/uploads", {
    method: "POST",
    body: form,
  });
}

/**
 * Build a File with a precisely-controlled byte length. The
 * underlying Request → FormData round-trip serialises the File,
 * so a patched `size` property is lost — actual byte length is
 * what the route sees. Allocate the real buffer (cheap; a few MB
 * per call).
 */
function makeFile(name: string, type: string, size: number): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe("POST /api/uploads", () => {
  it("rejects missing scope (400)", async () => {
    const fd = new FormData();
    fd.append("file", makeFile("a.png", "image/png", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("scope");
  });

  it("rejects unknown scope (400)", async () => {
    const fd = new FormData();
    fd.append("scope", "evil");
    fd.append("file", makeFile("a.png", "image/png", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("scope");
  });

  it("rejects missing file (400)", async () => {
    const fd = new FormData();
    fd.append("scope", "vendor_logo");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });

  it("rejects GIF for vendor_logo (MIME not in allowlist)", async () => {
    const fd = new FormData();
    fd.append("scope", "vendor_logo");
    fd.append("file", makeFile("a.gif", "image/gif", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("mime");
  });

  it("rejects SVG for app_gallery (no SVG in gallery)", async () => {
    const fd = new FormData();
    fd.append("scope", "app_gallery");
    fd.append("file", makeFile("a.svg", "image/svg+xml", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("mime");
  });

  it("accepts SVG for vendor_logo (logos are marks; SVG OK)", async () => {
    putMock.mockResolvedValue({ url: "https://blob.example/x.svg" });
    const fd = new FormData();
    fd.append("scope", "vendor_logo");
    fd.append("file", makeFile("a.svg", "image/svg+xml", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
  });

  it("rejects oversize logo (>1 MB)", async () => {
    const fd = new FormData();
    fd.append("scope", "vendor_logo");
    fd.append("file", makeFile("big.png", "image/png", 2 * 1024 * 1024));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("size");
  });

  it("rejects oversize gallery (>2 MB)", async () => {
    const fd = new FormData();
    fd.append("scope", "app_gallery");
    fd.append("file", makeFile("big.jpg", "image/jpeg", 3 * 1024 * 1024));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("size");
  });

  it("happy path: returns blob URL + alt; key is scoped to vendor_id", async () => {
    putMock.mockResolvedValue({ url: "https://blob.example/abc.png" });
    const fd = new FormData();
    fd.append("scope", "vendor_logo");
    fd.append("alt", "Acme wordmark");
    fd.append("file", makeFile("a.png", "image/png", 1024));

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://blob.example/abc.png");
    expect(json.alt).toBe("Acme wordmark");

    expect(putMock).toHaveBeenCalledTimes(1);
    const [path, file, opts] = putMock.mock.calls[0];
    expect(typeof path).toBe("string");
    expect(path).toMatch(/^vendor_logo\/42\/\d+-[a-f0-9]+\.png$/);
    expect(file).toBeInstanceOf(File);
    expect(opts.access).toBe("public");
    expect(opts.token).toBe("test_token");
    expect(opts.contentType).toBe("image/png");
  });

  it("happy path: app_logo scope keys correctly", async () => {
    putMock.mockResolvedValue({ url: "https://blob.example/y.webp" });
    const fd = new FormData();
    fd.append("scope", "app_logo");
    fd.append("file", makeFile("p.webp", "image/webp", 500));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const [path] = putMock.mock.calls[0];
    expect(path).toMatch(/^app_logo\/42\/\d+-[a-f0-9]+\.webp$/);
  });

  it("happy path: app_gallery scope keys correctly", async () => {
    putMock.mockResolvedValue({ url: "https://blob.example/g.jpg" });
    const fd = new FormData();
    fd.append("scope", "app_gallery");
    fd.append("file", makeFile("g.jpg", "image/jpeg", 500));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const [path] = putMock.mock.calls[0];
    expect(path).toMatch(/^app_gallery\/42\/\d+-[a-f0-9]+\.jpg$/);
  });

  it("trims and caps alt text at 200 chars", async () => {
    putMock.mockResolvedValue({ url: "https://blob.example/x.png" });
    const fd = new FormData();
    fd.append("scope", "vendor_logo");
    fd.append("alt", "  " + "x".repeat(500) + "  ");
    fd.append("file", makeFile("a.png", "image/png", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alt.length).toBe(200);
  });

  it("returns 502 when put() throws", async () => {
    putMock.mockRejectedValue(new Error("network down"));
    const fd = new FormData();
    fd.append("scope", "vendor_logo");
    fd.append("file", makeFile("a.png", "image/png", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(502);
  });
});

describe("POST /api/uploads — vendor row not yet created", () => {
  it("keys the path with member-<id> when vendor is null", async () => {
    const sessionMock = await import("@/lib/auth/session");
    vi.mocked(sessionMock.getVendorSession).mockResolvedValueOnce({
      vendor: null,
      vendorMember: { id: 7 },
      user: { id: "user_x", name: "X", email: "x@x" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    putMock.mockResolvedValue({ url: "https://blob.example/x.png" });
    const fd = new FormData();
    fd.append("scope", "vendor_logo");
    fd.append("file", makeFile("a.png", "image/png", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const [path] = putMock.mock.calls[0];
    expect(path).toMatch(/^vendor_logo\/member-7\/\d+-[a-f0-9]+\.png$/);
  });
});

describe("POST /api/uploads — env not configured", () => {
  it("returns 503 if BLOB_READ_WRITE_TOKEN is missing", async () => {
    const envMock = await import("@/lib/env");
    const original = envMock.env.blob;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (envMock.env as any).blob = () => {
      throw new Error("missing");
    };
    try {
      const fd = new FormData();
      fd.append("scope", "vendor_logo");
      fd.append("file", makeFile("a.png", "image/png", 100));
      const res = await POST(makeRequest(fd));
      expect(res.status).toBe(503);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (envMock.env as any).blob = original;
    }
  });
});
